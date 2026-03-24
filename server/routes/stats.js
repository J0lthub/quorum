import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/stats
router.get('/', async (_req, res) => {
  try {
    const [[{ activeAgents }]] = await pool.execute(
      "SELECT COUNT(*) AS activeAgents FROM agents a JOIN games g ON a.game_id = g.id WHERE g.status = 'active'"
    )
    const [[{ totalIterations }]] = await pool.execute(
      'SELECT COUNT(*) AS totalIterations FROM agent_scores'
    )
    const [[{ datasets }]] = await pool.execute(
      'SELECT COUNT(*) AS datasets FROM datasets'
    )
    res.json({ activeAgents, totalIterations, datasets })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
