import { Router }  from 'express'
import { nanoid }  from 'nanoid'
import { pool, withBranch } from '../db.js'
import { finishGame }       from './finish.js'

const router = Router()

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function perturb(v) { return clamp(v + (Math.random() * 4 - 2), 0, 100) }
function inZone(s, p) { return s >= 60 && p >= 60 }

// POST /api/games/:id/tick
router.post('/:id/tick', async (req, res) => {
  // Use `gameId` consistently throughout — rename the destructured param here.
  const { id: gameId } = req.params

  try {
    const [[game]] = await pool.execute("SELECT * FROM games WHERE id = ?", [gameId])
    if (!game) return res.status(404).json({ error: 'Game not found' })
    if (game.status === 'completed') return res.json({ gameId, completed: true, scores: {} })

    const [agents] = await pool.execute('SELECT * FROM agents WHERE game_id = ?', [gameId])

    const updatedScores = {}
    const iterations = []

    // Sequential loop — NOT Promise.all. Running all agents in parallel would
    // open 2 × numAgents TCP connections simultaneously (one agent branch + one
    // main branch per agent). Sequential limits peak connections to 2 regardless
    // of agent count, preventing connection pool exhaustion on the Dolt server.
    for (const agent of agents) {
      // Latest score from main
      const [[prev]] = await pool.execute(
        `SELECT social_score, planetary_score, iteration
         FROM agent_scores WHERE agent_id = ? ORDER BY iteration DESC LIMIT 1`,
        [agent.id]
      )

      const prevSocial    = prev?.social_score    ?? 60
      const prevPlanetary = prev?.planetary_score ?? 60
      const newIteration  = (prev?.iteration ?? 0) + 1

      const social    = perturb(prevSocial)
      const planetary = perturb(prevPlanetary)
      const habitable = (social + planetary) / 2
      const zone      = inZone(social, planetary) ? 1 : 0
      const scoreId   = nanoid()

      const commitMsg = [
        `${agent.persona_id} iteration ${newIteration}:`,
        `social=${social.toFixed(1)} (${social >= prevSocial ? '+' : ''}${(social - prevSocial).toFixed(1)})`,
        `planetary=${planetary.toFixed(1)} (${planetary >= prevPlanetary ? '+' : ''}${(planetary - prevPlanetary).toFixed(1)})`,
        `habitable=${habitable.toFixed(1)}`,
      ].join(' ')

      // (a) Write to agent's Dolt branch, bump the iteration counter on that
      //     branch, and commit — all on the same connection so the UPDATE is
      //     staged and versioned together with the agent_scores INSERT.
      await withBranch(agent.branch_name, async (conn) => {
        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [scoreId, agent.id, gameId, newIteration, social, planetary, habitable, zone, commitMsg]
        )
        // Move the iteration UPDATE inside this withBranch so it shares the
        // same connection as the INSERT, DOLT_ADD, and DOLT_COMMIT.  A pool
        // write outside would go through a different connection whose staging
        // area is separate — the UPDATE would never be staged/committed.
        await conn.execute(
          'UPDATE agents SET iteration = ? WHERE id = ?', [newIteration, agent.id]
        )
        await conn.execute('CALL DOLT_ADD(?)', ['.'])
        await conn.execute("CALL DOLT_COMMIT('-m', ?)", [commitMsg])
      })

      // (b) Write the same score row to main and commit it — main is the global
      // index for leaderboard / stats queries. All writes to main MUST happen
      // inside withBranch so that DOLT_ADD and DOLT_COMMIT share the same
      // connection as the INSERT (each connection has its own staging area).
      await withBranch('main', async (conn) => {
        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [scoreId, agent.id, gameId, newIteration, social, planetary, habitable, zone, commitMsg]
        )
        await conn.execute(
          'UPDATE agents SET iteration = ? WHERE id = ?', [newIteration, agent.id]
        )
        await conn.execute('CALL DOLT_ADD(?)', ['.'])
        await conn.execute("CALL DOLT_COMMIT('-m', ?)", [commitMsg])
      })

      updatedScores[agent.id] = {
        social, planetary, habitable, iteration: newIteration,
      }

      iterations.push(newIteration)
    }

    // Auto-finish only when ALL agents have completed 10 iterations.
    // Use minIteration (Math.min) — not maxIteration — so we wait for the
    // slowest agent. Using max would trigger finish as soon as any single
    // agent hit 10, potentially before others have run all their ticks.
    let completed = false
    const minIteration = Math.min(...iterations)
    if (minIteration >= 10) {
      await finishGame(gameId)
      completed = true
    }

    res.json({ gameId, scores: updatedScores, completed })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
