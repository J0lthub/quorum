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
 * TWO-COMMIT PATTERN: We must commit the leaderboard INSERT before we can
 * know the commit hash. After the first commit we read DOLT_HASHOF('HEAD'),
 * update the leaderboard row, and make a second commit. This is intentional:
 * the hash is not knowable until after the first commit, so two commits are
 * the minimum required. A comment marks each step for clarity.
 *
 * IDEMPOTENCY: The UPDATE uses `WHERE status='active'` as a DB-level guard.
 * Only the first caller will see affectedRows=1; all concurrent callers see 0
 * and return early. This avoids the read-then-write TOCTOU race.
 */
export async function finishGame(gameId) {
  // 1. Read game metadata and find the best in-zone agent BEFORE opening the
  //    write connection. These are read-only queries on already-committed data.
  const [[gameData]] = await pool.execute(
    'SELECT question, username, dataset FROM games WHERE id = ?', [gameId]
  )
  if (!gameData) return null
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
    // No in-zone agent — move UPDATE inside withBranch so it is staged and
    // committed on the same dedicated connection as DOLT_ADD/DOLT_COMMIT.
    await withBranch('main', async (conn) => {
      // DB-level idempotency guard: only one concurrent caller can win this UPDATE.
      const [result] = await conn.execute(
        "UPDATE games SET status='completed' WHERE id=? AND status='active'",
        [gameId]
      )
      if (result.affectedRows === 0) return
      await conn.execute('CALL DOLT_ADD(?)', ['.'])
      await conn.execute("CALL DOLT_COMMIT('-m', ?)", [`game ${gameId}: completed (no in-zone agent)`])
    })
    return null
  }

  // 2. INSERT leaderboard + DOLT_ADD + first DOLT_COMMIT + read hash +
  //    UPDATE commit_hash + DOLT_ADD + second DOLT_COMMIT — all on the SAME
  //    dedicated connection inside a single withBranch call.
  //
  //    TWO-COMMIT PATTERN (intentional):
  //    - Commit 1: stages the games UPDATE + leaderboard INSERT, creates the
  //      "finish" commit whose hash we need to record.
  //    - After commit 1 we read DOLT_HASHOF('HEAD') to get that hash.
  //    - Commit 2: stages the leaderboard.commit_hash UPDATE so the hash is
  //      persisted in the DB history. This second commit is the minimum extra
  //      work required; there is no way to know the hash before making it.
  const lbId = nanoid()
  let commitHash = ''
  let finished = false

  await withBranch('main', async (conn) => {
    // DB-level idempotency guard: only one concurrent caller can win this UPDATE.
    // withBranch creates a fresh connection that sees committed rows, so the
    // affectedRows check still provides the same race-free idempotency guarantee.
    const [result] = await conn.execute(
      "UPDATE games SET status='completed' WHERE id=? AND status='active'",
      [gameId]
    )
    if (result.affectedRows === 0) return

    finished = true

    // (a) INSERT leaderboard row with empty commit_hash placeholder
    await conn.execute(
      `INSERT INTO leaderboard
         (id, username, game_id, best_score, winning_persona, question, dataset, commit_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, '')`,
      [lbId, gameData.username ?? 'anonymous', gameId, best.habitable_score, best.persona_id,
       gameData.question, gameData.dataset ?? '']
    )
    // (b) Stage everything (games UPDATE + leaderboard INSERT)
    await conn.execute('CALL DOLT_ADD(?)', ['.'])
    // (c) First commit — this is the "finish" commit
    await conn.execute("CALL DOLT_COMMIT('-m', ?)", [
      `game ${gameId}: completed — winner ${best.persona_id} habitable=${best.habitable_score.toFixed(1)}`
    ])
    // (d) Read the hash of the commit we just made
    const [[hashRow]] = await conn.execute("SELECT DOLT_HASHOF('HEAD') AS h")
    commitHash = hashRow?.h ?? ''
    // (e) Update the leaderboard row with the now-known hash
    await conn.execute(
      'UPDATE leaderboard SET commit_hash = ? WHERE id = ?', [commitHash, lbId]
    )
    // (f) Second commit — persists the commit_hash back-fill
    await conn.execute('CALL DOLT_ADD(?)', ['.'])
    await conn.execute("CALL DOLT_COMMIT('-m', ?)", [
      `game ${gameId}: leaderboard commit_hash set to ${commitHash.slice(0, 7)}`
    ])
  })

  if (!finished) return null
  return { lbId, best, commitHash }
}

// POST /api/games/:id/finish  (manual trigger — also auto-called from tick at iteration 10)
// PROTOTYPE LIMITATION (issue 13): The SELECT then finishGame() call here has a
// TOCTOU window — a concurrent request could finish the game between the SELECT
// and the UPDATE inside finishGame(). The UPDATE's WHERE status='active' guard
// in finishGame() makes this safe at the DB level (only one caller wins), but
// the second caller's HTTP response will include already:false when it should
// arguably return already:true. Acceptable for a prototype.
router.post('/:id/finish', async (req, res) => {
  const { id: gameId } = req.params
  try {
    const [[game]] = await pool.execute('SELECT * FROM games WHERE id = ?', [gameId])
    if (!game) return res.status(404).json({ error: 'Game not found' })
    if (game.status === 'completed') return res.json({ already: true })

    const result = await finishGame(gameId)
    res.json({ finished: true, ...result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
