/**
 * Pure mapping helpers — no imports from client.js, no import.meta.env.
 * Safe to use in Node test environments (Vitest) without a browser/Vite context.
 */

/** Map a leaderboard row (snake_case from MySQL) to camelCase for the client. */
export const mapLeaderboardRow = row => ({
  rank:           row.rank,
  username:       row.username,
  bestScore:      row.best_score   ?? null,
  winningPersona: row.winning_persona ?? null,
  question:       row.question,
  dataset:        row.dataset,
  date:           row.created_at,
  commitHash:     row.commit_hash,
})
