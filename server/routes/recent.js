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

    if (games.length === 0) {
      return res.json(results)
    }

    const gameIds = games.map(g => g.id)
    const placeholders = gameIds.map(() => '?').join(', ')

    // Fetch all commit hashes in a single query instead of one per game (N+1 fix)
    const [lbRows] = await pool.execute(
      `SELECT game_id, commit_hash FROM leaderboard WHERE game_id IN (${placeholders})`,
      gameIds
    )
    const commitHashMap = new Map(lbRows.map(r => [r.game_id, r.commit_hash]))

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

      // Skip games where no in-zone agent exists (best is undefined/null) to
      // prevent `habitableScore.toFixed` TypeError on the client.
      if (!best) continue

      const commitHash = commitHashMap.get(game.id) ?? null

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
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
