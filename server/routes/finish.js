import { Router }     from 'express'
import { nanoid }     from 'nanoid'
import { pool, withBranch } from '../db.js'

const router = Router()

/**
 * Shared finish logic — called from tick auto-finish and from the POST route.
 * Exported so tick.js can call it without going through HTTP.
 *
 * CALLING ORDER: finishGame MUST be called AFTER all agent tick commits are
 * done (i.e. after the for...of agent loop in tick.js completes). The winner
 * SELECT reads agent_scores from the pool — those rows are only visible once
 * the withBranch('main', ...) commits in tick.js have completed. Calling
 * finishGame while ticks are still in-flight would produce stale results.
 *
 * SAME-CONNECTION RULE: UPDATE games, the leaderboard INSERT, DOLT_ADD and
 * DOLT_COMMIT must ALL run on the SAME dedicated connection inside a single
 * withBranch('main', ...) call. Any write that needs to be staged cannot go
 * through the pool — the pool connection's working-set is invisible to the
 * withBranch connection's staging area.
 *
 * The winner SELECT (read-only) happens BEFORE withBranch using the pool,
 * which is fine because those rows were already committed by tick.js.
 */
export async function finishGame(gameId) {
  // 1. Read game metadata and find the best in-zone agent BEFORE opening the
  //    write connection. These are read-only queries on already-committed data.
  //    Using pool here is safe because tick.js has finished its withBranch
  //    commits before calling finishGame.
  const [[game]] = await pool.execute(
    'SELECT question, username FROM games WHERE id = ?', [gameId]
  )
  const [[best]] = await pool.execute(
    `SELECT s.habitable_score, s.social_score, s.planetary_score, a.persona_id
     FROM agent_scores s
     JOIN agents a ON s.agent_id = a.id
     WHERE s.game_id = ? AND s.is_in_zone = 1
     ORDER BY s.habitable_score DESC
     LIMIT 1`,
    [gameId]
  )

  if (!best) {
    // No in-zone agent — mark completed and commit on one dedicated connection.
    // UPDATE games + DOLT_ADD + DOLT_COMMIT must share the same connection.
    await withBranch('main', async (conn) => {
      await conn.execute(
        "UPDATE games SET status = 'completed' WHERE id = ?", [gameId]
      )
      await conn.execute('CALL DOLT_ADD(?)', ['.'])
      await conn.execute("CALL DOLT_COMMIT('-m', ?)", [`game ${gameId}: completed (no in-zone agent)`])
    })
    return null
  }

  // 2. UPDATE games + INSERT leaderboard + DOLT_ADD + DOLT_COMMIT + read hash —
  //    ALL on the SAME dedicated connection inside a single withBranch call.
  //    Mixing pool writes with a separate withBranch commit leaves the pool
  //    connection's changes unstaged.
  //    username comes from game.username (set at POST /api/games creation time),
  //    NOT from best.persona_id — those are different concepts.
  //
  //    The commit_hash is obtained by calling SELECT DOLT_HASHOF('HEAD') on
  //    the SAME conn immediately after DOLT_COMMIT — this is the finish commit
  //    hash. Reading it from the pool after the block would require a separate
  //    round-trip and risks a race; reading it before DOLT_COMMIT would return
  //    the prior HEAD. Using DOLT_HASHOF('HEAD') on the same conn is the
  //    simplest and most correct approach — no back-fill UPDATE needed.
  const lbId = nanoid()
  let commitHash = ''
  await withBranch('main', async (conn) => {
    await conn.execute(
      "UPDATE games SET status = 'completed' WHERE id = ?", [gameId]
    )
    await conn.execute(
      `INSERT INTO leaderboard
         (id, username, game_id, best_score, winning_persona, question, dataset, commit_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, '')`,
      [lbId, game.username ?? 'anonymous', gameId, best.habitable_score, best.persona_id,
       game.question, '']
    )
    // DOLT_ADD and DOLT_COMMIT on the same conn — staging sees both the UPDATE and INSERT
    await conn.execute('CALL DOLT_ADD(?)', ['.'])
    await conn.execute("CALL DOLT_COMMIT('-m', ?)", [
      `game ${gameId}: completed — winner ${best.persona_id} habitable=${best.habitable_score.toFixed(1)}`
    ])
    // Read the finish commit hash on the SAME connection, immediately after
    // DOLT_COMMIT. DOLT_HASHOF('HEAD') returns the hash that was just created.
    // This avoids a second withBranch round-trip and requires no back-fill UPDATE.
    const [[hashRow]] = await conn.execute("SELECT DOLT_HASHOF('HEAD') AS h")
    commitHash = hashRow?.h ?? ''
    // Now that we have the hash, update the leaderboard row on the same conn
    // so it is staged and committed in the same transaction context.
    await conn.execute(
      'UPDATE leaderboard SET commit_hash = ? WHERE id = ?', [commitHash, lbId]
    )
    await conn.execute('CALL DOLT_ADD(?)', ['.'])
    await conn.execute("CALL DOLT_COMMIT('-m', ?)", [
      `game ${gameId}: set leaderboard commit_hash`
    ])
  })

  return { lbId, best, commitHash }
}

// POST /api/games/:id/finish  (manual trigger — also auto-called from tick at iteration 10)
router.post('/:id/finish', async (req, res) => {
  const { id: gameId } = req.params
  try {
    const [[game]] = await pool.execute('SELECT * FROM games WHERE id = ?', [gameId])
    if (!game) return res.status(404).json({ error: 'Game not found' })
    if (game.status === 'completed') return res.json({ already: true })

    const result = await finishGame(gameId)
    res.json({ finished: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
