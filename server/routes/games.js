import { Router }            from 'express'
import { nanoid }            from 'nanoid'
import { pool, ensureBranch, withBranch } from '../db.js'

const router = Router()

// ─── Persona validation ─────────────────────────────────────────────────────

// These 13 ids mirror the PERSONAS array in src/api/client.js exactly.
// Update both places if the persona list changes.
const VALID_PERSONA_IDS = new Set([
  'scientist',
  'engineer',
  'industrial_designer',
  'mathematician',
  'journalist',
  'commons_steward',
  'regenerative_econ',
  'equity_analyst',
  'planetary_bounds',
  'care_economy',
  'urban_ecologist',
  'degrowth',
  'indigenous',
])

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a game payload from flat JOIN rows.
 * Replaces the old per-game/per-agent N+1+M query pattern with a single JOIN.
 */
async function buildGamePayloads(gameIds) {
  if (gameIds.length === 0) return []

  // Single JOIN: games + agents + latest agent_scores (correlated subquery for latest)
  // iteration is computed from COUNT of agent_scores rows on main (accurate, no branch needed)
  const placeholders = gameIds.map(() => '?').join(', ')
  const [rows] = await pool.execute(
    `SELECT g.id AS game_id, g.question, g.status, g.created_at,
            a.id AS agent_id, a.persona_id, a.branch_name,
            (SELECT COUNT(*) FROM agent_scores WHERE agent_id = a.id) AS iteration,
            s.social_score, s.planetary_score
     FROM games g
     LEFT JOIN agents a ON a.game_id = g.id
     LEFT JOIN agent_scores s ON s.agent_id = a.id
       AND s.id = (SELECT id FROM agent_scores WHERE agent_id = a.id ORDER BY iteration DESC LIMIT 1)
     WHERE g.id IN (${placeholders})
     ORDER BY g.created_at DESC`,
    gameIds
  )

  // Assemble nested structure from flat rows
  const gamesMap = new Map()
  for (const row of rows) {
    if (!gamesMap.has(row.game_id)) {
      gamesMap.set(row.game_id, {
        id:        row.game_id,
        question:  row.question,
        status:    row.status,
        startedAt: row.created_at,
        agents:    [],
        scores:    {},
      })
    }
    const game = gamesMap.get(row.game_id)
    if (row.agent_id && !game.agents.find(a => a.id === row.agent_id)) {
      game.agents.push({
        id:        row.agent_id,
        personaId: row.persona_id,
        branch:    row.branch_name,
        iteration: row.iteration,
      })
      game.scores[row.agent_id] = {
        social:    row.social_score    ?? 0,
        planetary: row.planetary_score ?? 0,
        habitable: row.social_score != null && row.planetary_score != null
          ? (row.social_score + row.planetary_score) / 2
          : 0,
      }
    }
  }
  // Return in original game order (created_at DESC preserved by Map insertion order)
  return [...gamesMap.values()]
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/games
router.get('/', async (_req, res) => {
  try {
    const [games] = await pool.execute(
      'SELECT id FROM games ORDER BY created_at DESC LIMIT 20'
    )
    const payloads = await buildGamePayloads(games.map(g => g.id))
    res.json(payloads)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/games/:id
router.get('/:id', async (req, res) => {
  try {
    // Separate existence check from the agent/score join so a game with no
    // agents returns the game object with agents:[] rather than a 404.
    const [[gameRow]] = await pool.execute(
      'SELECT id FROM games WHERE id = ?', [req.params.id]
    )
    if (!gameRow) return res.status(404).json({ error: 'Game not found' })

    const payloads = await buildGamePayloads([req.params.id])
    // buildGamePayloads always returns one entry when the game exists
    res.json(payloads[0] ?? { id: req.params.id, agents: [], scores: {} })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/games  — body: { question, agents: ['persona_id', ...], username?: string, dataset?: string }
router.post('/', async (req, res) => {
  // Destructure without defaults first so type guards can catch non-string values
  // before the defaults would silently coerce them.
  const { question, agents: personaIds, username: rawUsername, dataset: rawDataset } = req.body

  // Type guards — must come before applying defaults
  if (typeof question !== 'string') return res.status(400).json({ error: 'question must be a string' })
  if (!Array.isArray(personaIds)) return res.status(400).json({ error: 'agents must be an array' })
  if (rawUsername !== undefined && typeof rawUsername !== 'string') return res.status(400).json({ error: 'username must be a string' })
  if (rawDataset !== undefined && typeof rawDataset !== 'string') return res.status(400).json({ error: 'dataset must be a string' })

  // Apply defaults after type guards
  const username = rawUsername ?? 'anonymous'
  const dataset  = rawDataset  ?? ''

  if (!question || question.length > 500) return res.status(400).json({ error: 'question required, max 500 chars' })
  if (personaIds.length < 2 || personaIds.length > 5) return res.status(400).json({ error: 'select 2–5 personas' })
  if (username && username.length > 64) return res.status(400).json({ error: 'username max 64 chars' })
  if (dataset && dataset.length > 128) return res.status(400).json({ error: 'dataset max 128 chars' })

  // Persona ID validation against the known list
  const invalid = personaIds.filter(id => !VALID_PERSONA_IDS.has(id))
  if (invalid.length) return res.status(400).json({ error: `Unknown personas: ${invalid.join(', ')}` })

  // Duplicate persona check
  const uniquePersonas = new Set(personaIds)
  if (uniquePersonas.size !== personaIds.length) return res.status(400).json({ error: 'Duplicate personas are not allowed' })

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
        'INSERT INTO games (id, question, status, username, dataset) VALUES (?, ?, ?, ?, ?)',
        [gameId, question, 'active', username, dataset]
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

    // Step 4: Create agent branches (they now fork from a committed main).
    // Wrapped in try/catch: if branch creation fails, do best-effort cleanup so
    // the partial game doesn't appear in the dashboard. Note: this cleanup does
    // NOT roll back the Dolt commit on main (prototype limitation), but removing
    // the DB rows means the game won't be surfaced by any query.
    try {
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
    } catch (branchErr) {
      console.error('Branch creation failed — cleaning up game rows:', branchErr)
      // Delete in FK-safe order: agent_scores → agents → games
      await pool.execute('DELETE FROM agent_scores WHERE game_id = ?', [gameId])
      await pool.execute('DELETE FROM agents WHERE game_id = ?', [gameId])
      await pool.execute('DELETE FROM games WHERE id = ?', [gameId])
      return res.status(500).json({ error: 'Failed to create agent branches' })
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
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
