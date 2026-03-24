import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/datasets
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM datasets ORDER BY name')
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
