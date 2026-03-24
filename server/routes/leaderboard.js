import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/leaderboard — top 10 by best_score desc, rank added in JS to avoid
// Dolt window function compatibility concerns.
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM leaderboard ORDER BY best_score DESC LIMIT 10'
    )
    res.json(rows.map((row, i) => ({ ...row, rank: i + 1 })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
