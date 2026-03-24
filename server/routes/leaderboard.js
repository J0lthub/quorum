import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/leaderboard — top 10 by best_score desc, with rank computed at query time
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT *, ROW_NUMBER() OVER (ORDER BY best_score DESC) AS rank
       FROM leaderboard ORDER BY best_score DESC LIMIT 10`
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
