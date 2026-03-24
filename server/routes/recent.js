import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/recent
router.get('/', async (_req, res) => {
  try {
    // Find the last 5 completed games ordered by creation time descending
    const [games] = await pool.execute(
      "SELECT * FROM games WHERE status = 'completed' ORDER BY created_at DESC LIMIT 5"
    )

    const results = []

    for (const game of games) {
      // Find the best in-zone agent score for this game (highest habitable)
      const [[best]] = await pool.execute(
        `SELECT s.habitable_score, a.persona_id, s.agent_id
         FROM agent_scores s
         JOIN agents a ON s.agent_id = a.id
         WHERE s.game_id = ? AND s.is_in_zone = 1
         ORDER BY s.habitable_score DESC
         LIMIT 1`,
        [game.id]
      )

      // Get the most recent commit hash on main for this game.
      // Do NOT use .catch(() => [[null]]) — that silently swallows real DB
      // errors and prevents the Express error handler from returning a 500.
      // Instead, check whether the query returned a row and fall back to null
      // gracefully when no matching log entry exists.
      const [logRows] = await pool.execute(
        `SELECT commit_hash FROM dolt_log
         WHERE message LIKE ?
         ORDER BY date DESC LIMIT 1`,
        [`%${game.id}%`]
      )
      const logRow = logRows[0]  // undefined when no matching row — not an error
      const commitHash = logRow ? logRow.commit_hash : null

      // Skip games where no in-zone agent exists (best is undefined/null) to
      // prevent `habitableScore.toFixed` TypeError on the client.
      if (!best) continue

      results.push({
        id:             game.id,
        question:       game.question,
        winningPersona: best.persona_id,
        habitableScore: best.habitable_score,
        commitHash,
        diffUrl:        '#',
      })
    }

    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
