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

    // ── Phase 1: fetch all previous scores + history in parallel ─────────────
    const agentData = await Promise.all(agents.map(async (agent) => {
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
      return {
        agent,
        prevSocial:    prev?.social_score    ?? 60,
        prevPlanetary: prev?.planetary_score ?? 60,
        newIteration:  (prev?.iteration ?? 0) + 1,
        history:       historyRows.map(r => r.decision).reverse(),
      }
    }))

    // ── Phase 2: all Claude calls in parallel ─────────────────────────────────
    const decisions = await Promise.all(agentData.map(({ agent, prevSocial, prevPlanetary, newIteration, history }) =>
      generateDecision({
        personaId:  agent.persona_id,
        question:   game.question,
        social:     prevSocial,
        planetary:  prevPlanetary,
        iteration:  newIteration,
        history,
      })
    ))

    // ── Phase 3: Dolt writes sequentially (one dedicated connection at a time) ─
    const updatedScores = {}
    const iterations    = []

    for (let i = 0; i < agents.length; i++) {
      const { agent, prevSocial, prevPlanetary, newIteration } = agentData[i]
      const { decision, reasoning, socialDelta, planetaryDelta } = decisions[i]

      const social    = clamp(prevSocial    + socialDelta,    0, 100)
      const planetary = clamp(prevPlanetary + planetaryDelta, 0, 100)
      const habitable = (social + planetary) / 2
      const zone      = social >= 60 && planetary >= 60 ? 1 : 0
      const scoreId     = nanoid()
      const mainScoreId = nanoid()
      const commitMsg   = `${agent.persona_id} (iter ${newIteration}): ${decision}`

      await withBranch(agent.branch_name, async (conn) => {
        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score,
              is_in_zone, commit_message, decision, reasoning)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [scoreId, agent.id, gameId, newIteration, social, planetary, habitable,
           zone, commitMsg, decision, reasoning]
        )
        await conn.execute('UPDATE agents SET iteration = ? WHERE id = ?', [newIteration, agent.id])
        await conn.execute('CALL DOLT_ADD(?)', ['.'])
        await conn.execute("CALL DOLT_COMMIT('-m', ?)", [commitMsg])
      })
      pushBranch(agent.branch_name).catch(err => console.error('DoltHub push failed (agent branch):', err))

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

      updatedScores[agent.id] = { social, planetary, habitable, iteration: newIteration, decision, reasoning }
      iterations.push(newIteration)
    }

    if (iterations.length === 0) return res.json({ scores: {}, completed: false })

    let completed = false
    if (Math.min(...iterations) >= 10) {
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
