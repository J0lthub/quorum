import { Router }     from 'express'
import { pool, withBranch } from '../db.js'

const router = Router()

// GET /api/games/:id/diff
router.get('/:id/diff', async (req, res) => {
  const { id: gameId } = req.params

  try {
    const [agents] = await pool.execute(
      'SELECT * FROM agents WHERE game_id = ?', [gameId]
    )

    const diffs = {}

    for (const agent of agents) {
      const commitLog = await withBranch(agent.branch_name, async (conn) => {
        const [rows] = await conn.execute(
          'SELECT commit_hash, message, date FROM dolt_log ORDER BY date DESC LIMIT 2'
        )
        return rows
      })

      if (commitLog.length < 2) {
        diffs[agent.id] = { commits: commitLog, changes: [] }
        continue
      }

      const [toCommit, fromCommit] = commitLog  // newest first

      const changes = await withBranch(agent.branch_name, async (conn) => {
        // Dolt 1.77 uses 'to_commit' (not 'to_commit_hash').
        // Use 'to_commit' — confirmed via SHOW COLUMNS FROM dolt_diff_agent_scores in init-dolt.sh.
        const [rows] = await conn.execute(
          `SELECT
             diff_type,
             to_social_score,    from_social_score,
             to_planetary_score, from_planetary_score,
             to_habitable_score, from_habitable_score,
             to_is_in_zone,      from_is_in_zone,
             to_iteration,       from_iteration,
             to_commit_message
           FROM dolt_diff_agent_scores
           WHERE to_commit = ?`,
          [toCommit.commit_hash]
        )
        return rows
      })

      diffs[agent.id] = {
        fromCommit: fromCommit.commit_hash,
        toCommit:   toCommit.commit_hash,
        message:    toCommit.message,
        changes,
      }
    }

    res.json(diffs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
