import { Router }            from 'express'
import { nanoid }            from 'nanoid'
import { pool, ensureBranch, withBranch } from '../db.js'

const router = Router()

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Map rows from agents + latest agent_scores into the frontend game shape. */
async function buildGamePayload(gameRow) {
  const [agents] = await pool.execute(
    'SELECT * FROM agents WHERE game_id = ? ORDER BY created_at', [gameRow.id]
  )

  const scores = {}
  for (const agent of agents) {
    const [scoreRows] = await pool.execute(
      `SELECT social_score, planetary_score, habitable_score, iteration
       FROM agent_scores
       WHERE agent_id = ?
       ORDER BY iteration DESC
       LIMIT 1`,
      [agent.id]
    )
    if (scoreRows.length) {
      const s = scoreRows[0]
      scores[agent.id] = {
        social:    s.social_score,
        planetary: s.planetary_score,
        habitable: s.habitable_score,
      }
    } else {
      scores[agent.id] = { social: 0, planetary: 0, habitable: 0 }
    }
  }

  return {
    id:        gameRow.id,
    question:  gameRow.question,
    status:    gameRow.status,
    startedAt: gameRow.created_at,
    agents:    agents.map(a => ({
      id:        a.id,
      personaId: a.persona_id,
      branch:    a.branch_name,
      iteration: a.iteration,
    })),
    scores,
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /api/games
router.get('/', async (_req, res) => {
  try {
    const [games] = await pool.execute("SELECT * FROM games ORDER BY created_at DESC")
    const payloads = await Promise.all(games.map(buildGamePayload))
    res.json(payloads)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/games/:id
router.get('/:id', async (req, res) => {
  try {
    const [[game]] = await pool.execute('SELECT * FROM games WHERE id = ?', [req.params.id])
    if (!game) return res.status(404).json({ error: 'Game not found' })
    res.json(await buildGamePayload(game))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/games  — body: { question, agents: ['persona_id', ...], username?: string }
router.post('/', async (req, res) => {
  const { question, agents: personaIds, username = 'anonymous' } = req.body
  if (!question || question.length > 500) return res.status(400).json({ error: 'question required, max 500 chars' })
  if (!personaIds || personaIds.length < 2 || personaIds.length > 5) return res.status(400).json({ error: 'select 2–5 personas' })

  const gameId = nanoid()

  try {
    const agentRows = []

    // Steps 1–3 and the DOLT_ADD/DOLT_COMMIT must ALL run on the SAME dedicated
    // connection. Using pool for inserts and a separate connection for
    // DOLT_ADD/DOLT_COMMIT would stage nothing — each connection has its own
    // working set, so the second connection would see an empty diff.
    await withBranch('main', async (conn) => {
      // Step 1: Insert game row
      await conn.execute(
        'INSERT INTO games (id, question, status, username) VALUES (?, ?, ?, ?)',
        [gameId, question, 'active', username]
      )

      // Step 2: Insert all agent and initial score rows
      for (const personaId of personaIds) {
        const agentId    = nanoid()
        const branchName = `agent/${personaId}-${agentId.slice(0, 8)}`

        await conn.execute(
          'INSERT INTO agents (id, game_id, persona_id, branch_name, iteration) VALUES (?,?,?,?,0)',
          [agentId, gameId, personaId, branchName]
        )

        const social    = 55 + Math.random() * 25
        const planetary = 55 + Math.random() * 25
        const habitable = (social + planetary) / 2
        const inZone    = social >= 60 && planetary >= 60 ? 1 : 0
        const scoreId   = nanoid()

        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,0,?,?,?,?,?)`,
          [scoreId, agentId, gameId, social, planetary, habitable, inZone,
           `init: ${personaId} baseline scores`]
        )

        agentRows.push({ id: agentId, personaId, branch: branchName, iteration: 0,
                         scoreId, social, planetary, habitable, inZone })
      }

      // Step 3: Commit all rows on THIS SAME connection.
      // Agent branches must fork from a committed main — otherwise foreign key
      // constraints on the agent branches will fail.
      await conn.execute('CALL DOLT_ADD(?)', ['.'])
      await conn.execute("CALL DOLT_COMMIT('-m', ?)", [`game ${gameId}: create game and agents`])
    })

    // Step 4: Create agent branches (they now fork from a committed main)
    for (const agent of agentRows) {
      await ensureBranch(agent.branch)

      // Write the initial score row onto the agent branch and commit it
      await withBranch(agent.branch, async (branchConn) => {
        await branchConn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,0,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE id=id`,
          [agent.scoreId, agent.id, gameId, agent.social, agent.planetary, agent.habitable,
           agent.inZone, `init: ${agent.personaId} baseline scores`]
        )
        await branchConn.execute('CALL DOLT_ADD(?)', ['.'])
        await branchConn.execute("CALL DOLT_COMMIT('-m', ?)", [
          `init: ${agent.personaId} baseline — social=${agent.social.toFixed(1)} planetary=${agent.planetary.toFixed(1)}`
        ])
      })
    }

    const scores = {}
    for (const a of agentRows) {
      scores[a.id] = { social: a.social, planetary: a.planetary, habitable: a.habitable }
    }

    res.status(201).json({
      id: gameId, question, status: 'active',
      startedAt: new Date().toISOString(),
      agents: agentRows.map(a => ({ id: a.id, personaId: a.personaId, branch: a.branch, iteration: 0 })),
      scores,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
