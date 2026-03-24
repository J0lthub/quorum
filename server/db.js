import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const BASE_CONFIG = {
  host:     process.env.DOLT_HOST     ?? '127.0.0.1',
  port:     parseInt(process.env.DOLT_PORT ?? '3307'),
  user:     process.env.DOLT_USER     ?? 'root',
  password: process.env.DOLT_PASSWORD ?? '',
  database: process.env.DOLT_DATABASE ?? 'donut_game',
}

// Shared pool for main-branch / stateless reads
export const pool = mysql.createPool({ ...BASE_CONFIG, connectionLimit: 10 })

/**
 * Open a dedicated connection, checkout the given branch, run fn(conn),
 * then release. Guarantees branch isolation per request.
 *
 * @param {string} branch  - Dolt branch name, e.g. 'agent/scientist-01'
 * @param {function} fn    - async (conn) => result
 */
export async function withBranch(branch, fn) {
  const conn = await mysql.createConnection(BASE_CONFIG)
  try {
    await conn.execute('CALL DOLT_CHECKOUT(?)', [branch])
    return await fn(conn)
  } finally {
    await conn.end()
  }
}

/**
 * Create a branch from the current HEAD of main.
 * Must only be called AFTER the parent rows (games, agents) have been
 * committed to main — otherwise the branch forks from a state that lacks
 * those rows and subsequent inserts on the branch will violate foreign keys.
 *
 * Uses a dedicated connection on main (not the pool) to avoid branch-context
 * bleed.
 */
export async function ensureBranch(branchName) {
  const conn = await mysql.createConnection(BASE_CONFIG)
  try {
    await conn.execute('CALL DOLT_CHECKOUT(?)', ['main'])
    try {
      await conn.execute('CALL DOLT_BRANCH(?)', [branchName])
    } catch (err) {
      if (!err.message?.includes('already exists')) throw err
    }
  } finally {
    await conn.end()
  }
}
