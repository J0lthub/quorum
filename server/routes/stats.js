import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/stats
router.get('/', async (_req, res) => {
  try {
    const [[{ activeAgents }]] = await pool.execute(
      "SELECT COUNT(*) AS activeAgents FROM agents a JOIN games g ON a.game_id = g.id WHERE g.status = 'active'"
    )
    const [[{ totalCommits }]] = await pool.execute(
      'SELECT COUNT(*) AS totalCommits FROM agent_scores'
    )
    const [[{ datasets }]] = await pool.execute(
      'SELECT COUNT(*) AS datasets FROM datasets'
    )
    res.json({ activeAgents, totalCommits, datasets })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
