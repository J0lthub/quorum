import { Router }     from 'express'
import { pool, withBranch } from '../db.js'

const router = Router()

// Cache which column name works across Dolt versions so we don't retry every call.
// Dolt >= 1.x uses 'to_commit_hash'; older versions use 'to_commit'.
let diffCommitColumn = null  // null = not yet determined

// GET /api/games/:id/diff
router.get('/:id/diff', async (req, res) => {
  const { id: gameId } = req.params

  try {
    const [agents] = await pool.execute(
      'SELECT * FROM agents WHERE game_id = ?', [gameId]
    )

    const diffs = {}

    for (const agent of agents) {
      // Merge both reads into a single withBranch call to eliminate the TOCTOU
      // window that could occur if a commit lands between the two separate calls.
      await withBranch(agent.branch_name, async (conn) => {
        const [commitLog] = await conn.execute(
          'SELECT commit_hash, message, date FROM dolt_log ORDER BY date DESC LIMIT 2'
        )

        if (commitLog.length < 2) {
          diffs[agent.id] = { commits: commitLog, changes: [] }
          return
        }

        const [toCommit, fromCommit] = commitLog  // newest first

        // Dolt version portability: some versions use 'to_commit', others use
        // 'to_commit_hash'. Try the cached column name first; if it fails with an
        // "unknown column" error, retry with the other name and cache the winner.
        const buildDiffQuery = (col) =>
          `SELECT
             diff_type,
             to_social_score,    from_social_score,
             to_planetary_score, from_planetary_score,
             to_habitable_score, from_habitable_score,
             to_is_in_zone,      from_is_in_zone,
             to_iteration,       from_iteration,
             to_commit_message
           FROM dolt_diff_agent_scores
           WHERE ${col} = ?`

        let changes
        const columnsToTry = diffCommitColumn
          ? [diffCommitColumn]
          : ['to_commit', 'to_commit_hash']

        for (const col of columnsToTry) {
          try {
            ;[changes] = await conn.execute(buildDiffQuery(col), [toCommit.commit_hash])
            diffCommitColumn = col  // cache the working column name
            break
          } catch (colErr) {
            if (!colErr.message?.toLowerCase().includes('unknown column')) throw colErr
            // Try the next candidate
          }
        }
        if (!changes) changes = []

        diffs[agent.id] = {
          fromCommit: fromCommit.commit_hash,
          toCommit:   toCommit.commit_hash,
          message:    toCommit.message,
          changes,
        }
      })
    }

    res.json(diffs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
