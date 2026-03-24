import { Router }  from 'express'
import { nanoid }  from 'nanoid'
import { pool, withBranch, pushBranch } from '../db.js'
import { finishGame }       from './finish.js'
import { generateDecision } from '../ai.js'

const router = Router()

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// POST /api/games/:id/tick
router.post('/:id/tick', async (req, res) => {
  const { id: gameId } = req.params

  try {
    const [[game]] = await pool.execute("SELECT * FROM games WHERE id = ?", [gameId])
    if (!game) return res.status(404).json({ error: 'Game not found' })
    if (game.status === 'completed') return res.json({ gameId, completed: true, scores: {} })

    const [agents] = await pool.execute('SELECT * FROM agents WHERE game_id = ?', [gameId])

    const updatedScores = {}
    const iterations = []

    // Sequential loop — NOT Promise.all. Keeps peak connections to 2 regardless
    // of agent count, preventing connection pool exhaustion on the Dolt server.
    for (const agent of agents) {
      // Latest score + last 3 decisions for this agent (for AI continuity)
      const [[prev]] = await pool.execute(
        `SELECT social_score, planetary_score, iteration
         FROM agent_scores WHERE agent_id = ? ORDER BY iteration DESC LIMIT 1`,
        [agent.id]
      )
      const [historyRows] = await pool.execute(
        `SELECT decision FROM agent_scores
         WHERE agent_id = ? AND decision IS NOT NULL
         ORDER BY iteration DESC LIMIT 3`,
        [agent.id]
      )

      const prevSocial    = prev?.social_score    ?? 60
      const prevPlanetary = prev?.planetary_score ?? 60
      const newIteration  = (prev?.iteration ?? 0) + 1
      const history       = historyRows.map(r => r.decision).reverse()

      // Ask Claude what this persona would do next
      const { decision, reasoning, socialDelta, planetaryDelta } = await generateDecision({
        personaId:  agent.persona_id,
        question:   game.question,
        social:     prevSocial,
        planetary:  prevPlanetary,
        iteration:  newIteration,
        history,
      })

      const social    = clamp(prevSocial    + socialDelta,    0, 100)
      const planetary = clamp(prevPlanetary + planetaryDelta, 0, 100)
      const habitable = (social + planetary) / 2
      const zone      = social >= 60 && planetary >= 60 ? 1 : 0
      const scoreId     = nanoid()
      const mainScoreId = nanoid()

      // Commit message = the persona's decision (visible as Dolt diff on DoltHub)
      const commitMsg = `${agent.persona_id} (iter ${newIteration}): ${decision}`

      // (a) Write to agent's Dolt branch — this is the canonical per-persona history
      await withBranch(agent.branch_name, async (conn) => {
        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score,
              is_in_zone, commit_message, decision, reasoning)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [scoreId, agent.id, gameId, newIteration, social, planetary, habitable,
           zone, commitMsg, decision, reasoning]
        )
        await conn.execute(
          'UPDATE agents SET iteration = ? WHERE id = ?', [newIteration, agent.id]
        )
        await conn.execute('CALL DOLT_ADD(?)', ['.'])
        await conn.execute("CALL DOLT_COMMIT('-m', ?)", [commitMsg])
      })
      pushBranch(agent.branch_name).catch(err => console.error('DoltHub push failed (agent branch):', err))

      // (b) Mirror to main branch for leaderboard / stats queries
      await withBranch('main', async (conn) => {
        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score,
              is_in_zone, commit_message, decision, reasoning)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [mainScoreId, agent.id, gameId, newIteration, social, planetary, habitable,
           zone, commitMsg, decision, reasoning]
        )
        await conn.execute('CALL DOLT_ADD(?)', ['.'])
        await conn.execute("CALL DOLT_COMMIT('-m', ?)", [commitMsg])
      })
      pushBranch('main').catch(err => console.error('DoltHub push failed (main):', err))

      updatedScores[agent.id] = {
        social, planetary, habitable, iteration: newIteration, decision, reasoning,
      }

      iterations.push(newIteration)
    }

    if (iterations.length === 0) {
      return res.json({ scores: {}, completed: false })
    }
    let completed = false
    const minIteration = Math.min(...iterations)
    if (minIteration >= 10) {
      await finishGame(gameId)
      completed = true
    }

    res.json({ gameId, scores: updatedScores, completed })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
