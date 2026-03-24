# The Donut Game — Dolt Backend Implementation Plan

Branch: `add-dolt-backend`
Goal: Replace `src/api/mock.js` with a real Express + Dolt (MySQL-compatible) backend.

---

## Overview

This plan covers eight workstreams (A–H) plus dependency and environment config
changes. Each workstream is fully specified: exact file paths, function signatures,
SQL statements, and shell commands.

**Component changes required:** `src/hooks/useGame.js` must be updated (see section G)
to replace its client-side random walk with server-driven ticks. Dolt is the source
of truth; the component must not mutate scores locally.

---

## A. Dolt Repo Initialization (`scripts/init-dolt.sh`)

### Purpose
One-time script that bootstraps the Dolt database used as the source of truth.
Run once before starting the server for the first time.

**Do NOT start a background `dolt sql-server` inside this script.** The server is
started separately via `npm run dolt`. This script uses only `dolt sql -q` CLI
commands (which lock the repo only for the duration of each command and do not
conflict with each other). Starting a background server here and then also calling
`dolt sql -q` causes a locked-repo error because both processes hold the data
directory.

### File: `scripts/init-dolt.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_DIR="${HOME}/Desktop/donut-game-db"
DOLT_BIN="/opt/homebrew/bin/dolt"

echo "==> Initializing Dolt repo at $DB_DIR"
mkdir -p "$DB_DIR"
cd "$DB_DIR"

if [ ! -d ".dolt" ]; then
  "$DOLT_BIN" init
  "$DOLT_BIN" config --local user.email "donut-game@local"
  "$DOLT_BIN" config --local user.name  "Donut Game"
fi

run_sql() {
  "$DOLT_BIN" sql -q "$1"
}

echo "==> Creating tables"
run_sql "
CREATE TABLE IF NOT EXISTS datasets (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  row_count   INT          NOT NULL DEFAULT 0,
  category    VARCHAR(64)  NOT NULL,
  description TEXT
);
"

run_sql "
CREATE TABLE IF NOT EXISTS games (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  question    TEXT          NOT NULL,
  status      VARCHAR(16)   NOT NULL DEFAULT 'active',
  username    VARCHAR(64)   NOT NULL DEFAULT 'anonymous',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"

run_sql "
CREATE TABLE IF NOT EXISTS agents (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  game_id     VARCHAR(36)   NOT NULL,
  persona_id  VARCHAR(64)   NOT NULL,
  branch_name VARCHAR(128)  NOT NULL,
  iteration   INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id)
);
"

run_sql "
CREATE TABLE IF NOT EXISTS agent_scores (
  id               VARCHAR(36) NOT NULL PRIMARY KEY,
  agent_id         VARCHAR(36) NOT NULL,
  game_id          VARCHAR(36) NOT NULL,
  iteration        INT         NOT NULL,
  social_score     DOUBLE      NOT NULL,
  planetary_score  DOUBLE      NOT NULL,
  habitable_score  DOUBLE      NOT NULL,
  is_in_zone       TINYINT(1)  NOT NULL DEFAULT 0,
  commit_message   TEXT,
  committed_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (game_id)  REFERENCES games(id)
);
"

run_sql "
CREATE TABLE IF NOT EXISTS leaderboard (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  username        VARCHAR(64)  NOT NULL,
  game_id         VARCHAR(36)  NOT NULL,
  best_score      DOUBLE       NOT NULL,
  winning_persona VARCHAR(64)  NOT NULL,
  question        TEXT         NOT NULL,
  dataset         VARCHAR(128) NOT NULL DEFAULT '',
  commit_hash     VARCHAR(40)  NOT NULL DEFAULT '',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"

echo "==> Seeding datasets"
run_sql "INSERT IGNORE INTO datasets (id, name, row_count, category, description) VALUES
  ('ds-01', 'EPA-2024',       42800, 'Environment', 'US EPA emissions and pollutant tracking 2024'),
  ('ds-02', 'FAOSTAT-2024',   91200, 'Agriculture', 'UN FAO global food and agriculture statistics'),
  ('ds-03', 'ILO-2023',       33400, 'Labour',      'ILO global employment and care economy data'),
  ('ds-04', 'ONS-2024',       18700, 'Economics',   'UK Office for National Statistics macro data'),
  ('ds-05', 'C40-Cities-23',  27600, 'Urban',       'C40 Cities climate action and heat-island data'),
  ('ds-06', 'ITU-2024',       14200, 'Technology',  'International Telecommunication Union ICT stats'),
  ('ds-07', 'Eurostat-2024',  64500, 'Social',      'Eurostat social and economic indicators 2024'),
  ('ds-08', 'IUCN-2024',      21900, 'Biodiversity','IUCN Red List and ecosystem health data'),
  ('ds-09', 'TfL-Open-2024',   8400, 'Transport',   'Transport for London open data 2024');
"

echo "==> Initial Dolt commit"
run_sql "CALL DOLT_ADD('.')"
run_sql "CALL DOLT_COMMIT('-m', 'init: create schema and seed datasets')"

echo "==> Done. Run 'npm run dolt' to start the sql-server, then 'npm run server' for Express."
```

Make it executable: `chmod +x scripts/init-dolt.sh`

---

## B. Express Server Structure

```
server/
  index.js          # app setup, middleware, route mounting, listen()
  db.js             # Dolt connection helpers (single-connection pattern)
  routes/
    datasets.js     # GET /api/datasets
    games.js        # GET/POST /api/games, GET /api/games/:id
    tick.js         # POST /api/games/:id/tick
    finish.js       # POST /api/games/:id/finish  (also called auto from tick at iteration 10)
    diff.js         # GET  /api/games/:id/diff
    leaderboard.js  # GET  /api/leaderboard
    recent.js       # GET  /api/recent
    stats.js        # GET  /api/stats
```

### `server/index.js`

```js
import express        from 'express'
import cors           from 'cors'
import dotenv         from 'dotenv'
import datasetsRouter    from './routes/datasets.js'
import gamesRouter       from './routes/games.js'
import tickRouter        from './routes/tick.js'
import finishRouter      from './routes/finish.js'
import diffRouter        from './routes/diff.js'
import leaderboardRouter from './routes/leaderboard.js'
import recentRouter      from './routes/recent.js'
import statsRouter       from './routes/stats.js'

dotenv.config()

const app  = express()
const PORT = process.env.SERVER_PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/api/datasets',     datasetsRouter)
app.use('/api/games',        gamesRouter)
app.use('/api/games',        tickRouter)
app.use('/api/games',        finishRouter)
app.use('/api/games',        diffRouter)
app.use('/api/leaderboard',  leaderboardRouter)
app.use('/api/recent',       recentRouter)
app.use('/api/stats',        statsRouter)

app.listen(PORT, () => console.log(`Express listening on :${PORT}`))
```

---

## C. Dolt Connection Management (`server/db.js`)

Because branch context is per-connection in Dolt's SQL server, every operation
that needs a specific branch must:

1. Open a fresh dedicated connection.
2. `CALL DOLT_CHECKOUT('branch')`.
3. Run the query.
4. Release the connection.

A connection pool is used only for main-branch reads (datasets, leaderboard, stats).

### `server/db.js`

```js
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
```

---

## D. API Route Implementations

### `server/routes/datasets.js`

```js
import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/datasets
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM datasets ORDER BY name')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

---

### `server/routes/leaderboard.js`

```js
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
```

---

### `server/routes/recent.js`

Returns the last 5 completed game scores in the shape expected by `RecentResults.jsx`:
`{ id, question, winningPersona, habitableScore, commitHash, diffUrl }`.

The `commitHash` is pulled from `dolt_log` on main. If no matching log entry exists,
`commitHash` is `null` — this is not an error and is handled gracefully.
Real DB errors propagate to the Express error handler (returned as 500) rather than
being swallowed by a `.catch(() => [[null]])` pattern.
The `diffUrl` is `#` until a DoltHub integration is added.

```js
import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

// GET /api/recent
router.get('/', async (_req, res) => {
  try {
    // Find the last 5 completed games ordered by creation time descending
    const [games] = await pool.execute(
      "SELECT * FROM games WHERE status = 'completed' ORDER BY created_at DESC LIMIT 5"
    )

    const results = []

    for (const game of games) {
      // Find the best in-zone agent score for this game (highest habitable)
      const [[best]] = await pool.execute(
        `SELECT s.habitable_score, a.persona_id, s.agent_id
         FROM agent_scores s
         JOIN agents a ON s.agent_id = a.id
         WHERE s.game_id = ? AND s.is_in_zone = 1
         ORDER BY s.habitable_score DESC
         LIMIT 1`,
        [game.id]
      )

      // Get the most recent commit hash on main for this game.
      // Do NOT use .catch(() => [[null]]) — that silently swallows real DB
      // errors and prevents the Express error handler from returning a 500.
      // Instead, check whether the query returned a row and fall back to null
      // gracefully when no matching log entry exists.
      const [logRows] = await pool.execute(
        `SELECT commit_hash FROM dolt_log
         WHERE message LIKE ?
         ORDER BY date DESC LIMIT 1`,
        [`%${game.id}%`]
      )
      const logRow = logRows[0]  // undefined when no matching row — not an error
      const commitHash = logRow ? logRow.commit_hash : null

      // Skip games where no in-zone agent exists (best is undefined/null) to
      // prevent `habitableScore.toFixed` TypeError on the client.
      if (!best) continue

      results.push({
        id:             game.id,
        question:       game.question,
        winningPersona: best.persona_id,
        habitableScore: best.habitable_score,
        commitHash,
        diffUrl:        '#',
      })
    }

    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

---

### `server/routes/stats.js`

```js
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
```

---

### `server/routes/games.js`

Handles listing, fetching, and creating games.

**Critical ordering for game creation:**
1. All inserts (games, agents, agent_scores) AND `DOLT_ADD`/`DOLT_COMMIT` must
   run on the **same dedicated connection** via `withBranch('main', async conn => { ... })`.
   Using `pool` for inserts then a separate connection for `DOLT_ADD` means the
   staging area on the second connection sees nothing — the pool connection's
   uncommitted working-set changes are invisible to a different connection.
2. Insert into `games` on the dedicated conn.
3. Insert all `agents` rows on the dedicated conn.
4. Insert all initial `agent_scores` rows on the dedicated conn.
5. **Commit all rows to main** on the same conn: `CALL DOLT_ADD('.')` then
   `CALL DOLT_COMMIT('-m', 'game {id}: create game and agents')`.
6. Only then call `ensureBranch(branchName)` for each agent — so the branch
   forks from a main that already contains the parent rows. Attempting to insert
   `agent_scores` (which has foreign keys to `agents` and `games`) on a branch
   that forked before those rows existed causes a foreign key violation.

```js
import { Router }            from 'express'
import { nanoid }            from 'nanoid'
import { pool, ensureBranch, withBranch } from '../db.js'

const router = Router()

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Map rows from agents + latest agent_scores into the frontend game shape. */
async function buildGamePayload(gameRow) {
  const [agents] = await pool.execute(
    'SELECT * FROM agents WHERE game_id = ? ORDER BY created_at', [gameRow.id]
  )

  const scores = {}
  for (const agent of agents) {
    const [scoreRows] = await pool.execute(
      `SELECT social_score, planetary_score, habitable_score, iteration
       FROM agent_scores
       WHERE agent_id = ?
       ORDER BY iteration DESC
       LIMIT 1`,
      [agent.id]
    )
    if (scoreRows.length) {
      const s = scoreRows[0]
      scores[agent.id] = {
        social:    s.social_score,
        planetary: s.planetary_score,
        habitable: s.habitable_score,
      }
    } else {
      scores[agent.id] = { social: 0, planetary: 0, habitable: 0 }
    }
  }

  return {
    id:        gameRow.id,
    question:  gameRow.question,
    status:    gameRow.status,
    startedAt: gameRow.created_at,
    agents:    agents.map(a => ({
      id:        a.id,
      personaId: a.persona_id,
      branch:    a.branch_name,
      iteration: a.iteration,
    })),
    scores,
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /api/games
router.get('/', async (_req, res) => {
  try {
    const [games] = await pool.execute("SELECT * FROM games ORDER BY created_at DESC")
    const payloads = await Promise.all(games.map(buildGamePayload))
    res.json(payloads)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/games/:id
router.get('/:id', async (req, res) => {
  try {
    const [[game]] = await pool.execute('SELECT * FROM games WHERE id = ?', [req.params.id])
    if (!game) return res.status(404).json({ error: 'Game not found' })
    res.json(await buildGamePayload(game))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/games  — body: { question, agents: ['persona_id', ...], username?: string }
router.post('/', async (req, res) => {
  const { question, agents: personaIds, username = 'anonymous' } = req.body
  if (!question || !Array.isArray(personaIds) || personaIds.length === 0) {
    return res.status(400).json({ error: 'question and agents[] are required' })
  }

  const gameId = nanoid()

  try {
    const agentRows = []

    // Steps 1–3 and the DOLT_ADD/DOLT_COMMIT must ALL run on the SAME dedicated
    // connection. Using pool for inserts and a separate connection for
    // DOLT_ADD/DOLT_COMMIT would stage nothing — each connection has its own
    // working set, so the second connection would see an empty diff.
    await withBranch('main', async (conn) => {
      // Step 1: Insert game row
      await conn.execute(
        'INSERT INTO games (id, question, status, username) VALUES (?, ?, ?, ?)',
        [gameId, question, 'active', username]
      )

      // Step 2: Insert all agent and initial score rows
      for (const personaId of personaIds) {
        const [[{ cnt }]] = await conn.execute(
          'SELECT COUNT(*) AS cnt FROM agents WHERE persona_id = ?', [personaId]
        )
        const seq        = String(parseInt(cnt) + 1).padStart(2, '0')
        const branchName = `agent/${personaId}-${seq}`
        const agentId    = nanoid()

        await conn.execute(
          'INSERT INTO agents (id, game_id, persona_id, branch_name, iteration) VALUES (?,?,?,?,0)',
          [agentId, gameId, personaId, branchName]
        )

        const social    = 55 + Math.random() * 25
        const planetary = 55 + Math.random() * 25
        const habitable = (social + planetary) / 2
        const inZone    = social >= 60 && planetary >= 60 ? 1 : 0
        const scoreId   = nanoid()

        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,0,?,?,?,?,?)`,
          [scoreId, agentId, gameId, social, planetary, habitable, inZone,
           `init: ${personaId} baseline scores`]
        )

        agentRows.push({ id: agentId, personaId, branch: branchName, iteration: 0,
                         scoreId, social, planetary, habitable, inZone })
      }

      // Step 3: Commit all rows on THIS SAME connection.
      // Agent branches must fork from a committed main — otherwise foreign key
      // constraints on the agent branches will fail.
      await conn.execute('CALL DOLT_ADD(?)', ['.'])
      await conn.execute("CALL DOLT_COMMIT('-m', ?)", [`game ${gameId}: create game and agents`])
    })

    // Step 4: Create agent branches (they now fork from a committed main)
    for (const agent of agentRows) {
      await ensureBranch(agent.branch)

      // Write the initial score row onto the agent branch and commit it
      await withBranch(agent.branch, async (branchConn) => {
        await branchConn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,0,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE id=id`,
          [agent.scoreId, agent.id, gameId, agent.social, agent.planetary, agent.habitable,
           agent.inZone, `init: ${agent.personaId} baseline scores`]
        )
        await branchConn.execute('CALL DOLT_ADD(?)', ['.'])
        await branchConn.execute("CALL DOLT_COMMIT('-m', ?)", [
          `init: ${agent.personaId} baseline — social=${agent.social.toFixed(1)} planetary=${agent.planetary.toFixed(1)}`
        ])
      })
    }

    const scores = {}
    for (const a of agentRows) {
      scores[a.id] = { social: a.social, planetary: a.planetary, habitable: a.habitable }
    }

    res.status(201).json({
      id: gameId, question, status: 'active',
      startedAt: new Date().toISOString(),
      agents: agentRows.map(a => ({ id: a.id, personaId: a.personaId, branch: a.branch, iteration: 0 })),
      scores,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

---

## E. Simulation Tick (`server/routes/tick.js`)

Each tick:
1. Fetches each agent's latest score from main.
2. Applies a ±2 random walk on social and planetary.
3. Writes the new score to `agent_scores` on main (for global queries).
4. Checks out the agent's branch, writes the same row there, commits with a
   descriptive message that encodes the delta.
5. Bumps `agents.iteration`.
6. **When `minIteration >= 10` (all agents have completed 10 iterations), marks
   the game `completed`** and calls the finish logic inline (see section E2 below).
   `minIteration = Math.min(...iterations)` — using min ensures every agent is
   done, not just the fastest one.

**`CALL DOLT_COMMIT` argument format:** The `-m` flag and the message must be
passed as two separate bound parameters using `"CALL DOLT_COMMIT('-m', ?)"`.
Never use `"CALL DOLT_COMMIT(?)"` with a single parameter — that syntax is
incorrect and will throw a Dolt SQL error.

```js
import { Router }  from 'express'
import { nanoid }  from 'nanoid'
import { pool, withBranch } from '../db.js'
import { finishGame }       from './finish.js'

const router = Router()

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function perturb(v) { return clamp(v + (Math.random() * 4 - 2), 0, 100) }
function inZone(s, p) { return s >= 60 && p >= 60 }

// POST /api/games/:id/tick
router.post('/:id/tick', async (req, res) => {
  // Use `gameId` consistently throughout — rename the destructured param here.
  const { id: gameId } = req.params

  try {
    const [[game]] = await pool.execute("SELECT * FROM games WHERE id = ?", [gameId])
    if (!game) return res.status(404).json({ error: 'Game not found' })
    if (game.status === 'completed') return res.json({ gameId, completed: true, scores: {} })

    const [agents] = await pool.execute('SELECT * FROM agents WHERE game_id = ?', [gameId])

    const updatedScores = {}
    const iterations = []

    // Sequential loop — NOT Promise.all. Running all agents in parallel would
    // open 2 × numAgents TCP connections simultaneously (one agent branch + one
    // main branch per agent). Sequential limits peak connections to 2 regardless
    // of agent count, preventing connection pool exhaustion on the Dolt server.
    for (const agent of agents) {
      // Latest score from main
      const [[prev]] = await pool.execute(
        `SELECT social_score, planetary_score, iteration
         FROM agent_scores WHERE agent_id = ? ORDER BY iteration DESC LIMIT 1`,
        [agent.id]
      )

      const prevSocial    = prev?.social_score    ?? 60
      const prevPlanetary = prev?.planetary_score ?? 60
      const newIteration  = (prev?.iteration ?? 0) + 1

      const social    = perturb(prevSocial)
      const planetary = perturb(prevPlanetary)
      const habitable = (social + planetary) / 2
      const zone      = inZone(social, planetary) ? 1 : 0
      const scoreId   = nanoid()

      const commitMsg = [
        `${agent.persona_id} iteration ${newIteration}:`,
        `social=${social.toFixed(1)} (${social >= prevSocial ? '+' : ''}${(social - prevSocial).toFixed(1)})`,
        `planetary=${planetary.toFixed(1)} (${planetary >= prevPlanetary ? '+' : ''}${(planetary - prevPlanetary).toFixed(1)})`,
        `habitable=${habitable.toFixed(1)}`,
      ].join(' ')

      // (a) Write to agent's Dolt branch and commit
      // Note: DOLT_COMMIT requires '-m' as a separate first argument
      // (a) Write to agent's Dolt branch, bump the iteration counter on that
      //     branch, and commit — all on the same connection so the UPDATE is
      //     staged and versioned together with the agent_scores INSERT.
      await withBranch(agent.branch_name, async (conn) => {
        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [scoreId, agent.id, gameId, newIteration, social, planetary, habitable, zone, commitMsg]
        )
        // Move the iteration UPDATE inside this withBranch so it shares the
        // same connection as the INSERT, DOLT_ADD, and DOLT_COMMIT.  A pool
        // write outside would go through a different connection whose staging
        // area is separate — the UPDATE would never be staged/committed.
        await conn.execute(
          'UPDATE agents SET iteration = ? WHERE id = ?', [newIteration, agent.id]
        )
        await conn.execute('CALL DOLT_ADD(?)', ['.'])
        await conn.execute("CALL DOLT_COMMIT('-m', ?)", [commitMsg])
      })

      // (b) Write the same score row to main and commit it — main is the global
      // index for leaderboard / stats queries. All writes to main MUST happen
      // inside withBranch so that DOLT_ADD and DOLT_COMMIT share the same
      // connection as the INSERT (each connection has its own staging area).
      // The SELECT * FROM agents at the top of the tick loop uses the pool for
      // a read — committed data is visible to all connections, so the iteration
      // value written in step (a) will be readable via the pool on the next tick.
      await withBranch('main', async (conn) => {
        await conn.execute(
          `INSERT INTO agent_scores
             (id, agent_id, game_id, iteration, social_score, planetary_score, habitable_score, is_in_zone, commit_message)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [scoreId, agent.id, gameId, newIteration, social, planetary, habitable, zone, commitMsg]
        )
        await conn.execute(
          'UPDATE agents SET iteration = ? WHERE id = ?', [newIteration, agent.id]
        )
        await conn.execute('CALL DOLT_ADD(?)', ['.'])
        await conn.execute("CALL DOLT_COMMIT('-m', ?)", [commitMsg])
      })

      updatedScores[agent.id] = {
        social, planetary, habitable, iteration: newIteration,
      }

      iterations.push(newIteration)
    }

    // Auto-finish only when ALL agents have completed 10 iterations.
    // Use minIteration (Math.min) — not maxIteration — so we wait for the
    // slowest agent. Using max would trigger finish as soon as any single
    // agent hit 10, potentially before others have run all their ticks.
    let completed = false
    const minIteration = Math.min(...iterations)
    if (minIteration >= 10) {
      await finishGame(gameId)
      completed = true
    }

    res.json({ gameId, scores: updatedScores, completed })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

---

## E2. Game Finish Logic (`server/routes/finish.js`)

When a game ends (either via auto-finish from tick or via `POST /api/games/:id/finish`):

1. Mark the game as `completed` on main.
2. Find the best in-zone agent (social >= 60 AND planetary >= 60) by highest
   `habitable_score`.
3. Insert a row into `leaderboard` on main.
4. Get the current commit hash from `dolt_log`.
5. Commit the leaderboard insertion to main so the entry is versioned.

```js
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

  // 2. UPDATE games + INSERT leaderboard + DOLT_ADD + DOLT_COMMIT — ALL on the
  //    SAME dedicated connection. Mixing pool writes with a separate withBranch
  //    commit leaves the pool connection's changes unstaged.
  //    username comes from game.username (set at POST /api/games creation time),
  //    NOT from best.persona_id — those are different concepts.
  //
  //    commitHash is read AFTER this block completes (see step 3 below).
  //    Reading it before the finish commit would record the hash of the previous
  //    commit, not the finish commit itself.
  const lbId = nanoid()
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
  })

  // 3. Read the commit hash AFTER the finish commit so we capture the correct
  //    HEAD. Reading before withBranch above would return the prior commit hash.
  //    Pool is fine here — the finish commit is now the HEAD on main.
  const [[logRow]] = await pool.execute(
    'SELECT commit_hash FROM dolt_log ORDER BY date DESC LIMIT 1'
  )
  const commitHash = logRow?.commit_hash ?? ''

  // 4. Back-fill the commit_hash on the leaderboard row now that we know it.
  await pool.execute(
    'UPDATE leaderboard SET commit_hash = ? WHERE id = ?', [commitHash, lbId]
  )

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
```

---

## F. Diff API (`server/routes/diff.js`)

Uses Dolt's `dolt_diff_agent_scores` system table. Each agent's diff is fetched
from its own branch connection, showing exactly what changed between the two most
recent commits on that branch.

```js
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
    res.status(500).json({ error: err.message })
  }
})

export default router
```

---

## G. Frontend API Layer Replacement

Replace `src/api/mock.js` function calls with `fetch()` calls to the Express
server. Create `src/api/client.js` and update all import sites.

**Component change required — `src/hooks/useGame.js`:**
The existing `useGame.js` runs a `setInterval` that applies a random walk to
scores client-side. This must be replaced so that Dolt is the source of truth.
The new behaviour:
- Call `tickGame(id)` (the `POST /api/games/:id/tick` endpoint) every 2 seconds
  via `setInterval`.
- On each response, update `agentScores` state from `response.scores` — do not
  mutate scores locally.
- When `response.completed === true`, clear the interval and mark the game done.
- Remove all local `Math.random()` score mutation from `useGame.js`.

This is the only component file that needs logic changes. All other files only
need their import path changed from `mock.js` to `client.js`.

The key constraint: **the returned shape from every `client.js` function must be
identical to `mock.js`** so no other component code changes are needed.

### `src/api/client.js`

```js
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

// ─── snake_case → camelCase helpers ────────────────────────────────────────

/** Map a leaderboard row (snake_case from MySQL) to camelCase for the client. */
function mapLeaderboardRow(row) {
  return {
    ...row,
    rank:           row.rank,           // computed by ROW_NUMBER() in the query
    winningPersona: row.winning_persona,
    bestScore:      row.best_score,
    commitHash:     row.commit_hash,
    createdAt:      row.created_at,
  }
}

/** Map a recent-results row (snake_case from MySQL) to camelCase for the client. */
function mapRecentRow(row) {
  return {
    ...row,
    winningPersona: row.winning_persona ?? row.winningPersona,
    habitableScore: row.habitable_score  ?? row.habitableScore,
    commitHash:     row.commit_hash      ?? row.commitHash,
  }
}

// ────────────────────────────────────────────────────────────────────────────

export const PERSONAS = [
  { id: 'scientist',           name: 'Scientist',               color: '#5b8dd9', icon: '🔬', blurb: 'Hypothesis-driven. Weights statistical significance.',    priorities: ['evidence','significance','replication'] },
  { id: 'engineer',            name: 'Engineer',                color: '#e07b39', icon: '⚙️', blurb: 'Pragmatic and constraint-aware. Optimizes for feasibility.', priorities: ['feasibility','cost','buildability'] },
  { id: 'industrial_designer', name: 'Industrial Designer',     color: '#9b6dd6', icon: '✏️', blurb: 'Systems thinker. Weights user experience and elegant redesign.', priorities: ['UX','systems','elegance'] },
  { id: 'mathematician',       name: 'Mathematician',           color: '#d4c44a', icon: '∑',  blurb: 'Pure optimization. Finds the most efficient path to metrics.', priorities: ['efficiency','optimality','precision'] },
  { id: 'journalist',          name: 'Journalist',              color: '#e05c5c', icon: '✍️', blurb: 'Follows the human story. Weights equity and social impact.',    priorities: ['equity','narrative','scrutiny'] },
  { id: 'commons_steward',     name: 'Commons Steward',         color: '#4db3a0', icon: '🤝', blurb: 'Prioritizes shared resources. Asks: who owns this?',           priorities: ['commons','collective','governance'] },
  { id: 'regenerative_econ',   name: 'Regenerative Economist',  color: '#7cc47c', icon: '♻️', blurb: 'Thinks in circular systems. Waste is always an input.',        priorities: ['circularity','lifecycle','waste'] },
  { id: 'equity_analyst',      name: 'Social Equity Analyst',   color: '#e87fac', icon: '⚖️', blurb: 'Scores every solution by who it helps least.',                 priorities: ['equity','bottom20%','access'] },
  { id: 'planetary_bounds',    name: 'Planetary Boundaries',    color: '#64b5f6', icon: '🌍', blurb: 'Hard ceiling enforcer. Will reject overshoot solutions.',       priorities: ['ceilings','thresholds','hard-limits'] },
  { id: 'care_economy',        name: 'Care Economy Advocate',   color: '#f48fb1', icon: '💙', blurb: 'Surfaces unpaid labor and community work GDP ignores.',         priorities: ['care','invisible-labor','community'] },
  { id: 'urban_ecologist',     name: 'Urban Ecologist',         color: '#81c784', icon: '🌿', blurb: 'Finds where city systems meet living systems.',                 priorities: ['biodiversity','green-infra','habitat'] },
  { id: 'degrowth',            name: 'Degrowth Strategist',     color: '#ffb74d', icon: '📉', blurb: 'The provocateur. Asks: what if the solution is less?',          priorities: ['degrowth','sufficiency','challenge'] },
  { id: 'indigenous',          name: 'Indigenous Knowledge',    color: '#a1887f', icon: '🌄', blurb: 'Long-horizon thinking. Place-based wisdom.',                    priorities: ['place','long-horizon','wisdom'] },
]

export async function fetchDatasets()    { return get('/api/datasets') }
export async function fetchGames()       { return get('/api/games') }
export async function fetchGame(id)      { return get(`/api/games/${id}`) }
export async function fetchLiveStats()   { return get('/api/stats') }
export async function fetchDiff(id)      { return get(`/api/games/${id}/diff`) }

/**
 * fetchLeaderboard — maps snake_case DB columns to camelCase for the client.
 * LeaderboardSidebar.jsx references `winningPersona`, `bestScore`, `commitHash`,
 * `createdAt` — all camelCase. The server returns snake_case from MySQL, so the
 * mapping must happen here.
 */
export async function fetchLeaderboard() {
  const rows = await get('/api/leaderboard')
  return rows.map(mapLeaderboardRow)
}

/**
 * fetchRecent — used by RecentResults.jsx.
 * Returns: Array<{ id, question, winningPersona, habitableScore, commitHash, diffUrl }>
 *
 * Maps snake_case server columns to camelCase. Does NOT coerce habitableScore to 0 —
 * let it be null when there is no winner. RecentResults.jsx must guard against null
 * before calling .toFixed() (see component change below).
 */
export async function fetchRecent() {
  const entries = await get('/api/recent')
  return entries.map(mapRecentRow)
}

/**
 * createGame — username is optional; defaults to 'anonymous' if not provided.
 * No UI change needed — PersonaModal.jsx can omit username and the server will
 * default it. Pass a username string here if the UI ever collects one.
 */
export async function createGame({ question, agents, username = 'anonymous' }) {
  return post('/api/games', { question, agents, username })
}

/**
 * tickGame — called by useGame.js every 2 seconds.
 * Returns: { gameId, scores: { [agentId]: { social, planetary, habitable, iteration } }, completed }
 */
export async function tickGame(id) {
  return post(`/api/games/${id}/tick`, {})
}
```

### `src/hooks/useGame.js` — required changes

The `setInterval` random walk must be replaced with server-driven ticks.
Replace the interval body with a call to `tickGame` from `client.js`:

```js
// BEFORE (remove this pattern):
setInterval(() => {
  setAgentScores(prev => {
    // ... local Math.random() mutation ...
  })
}, 2000)

// AFTER (replace with this pattern):
import { useRef } from 'react'
import { tickGame, fetchGame } from '../api/client.js'

// The hook parameter MUST be named `gameId` (not `id`) so references below are consistent.
// If the existing hook uses `id`, rename it to `gameId` AND update:
//   - fetchGame(gameId)
//   - the useEffect dependency array: [gameId]
//   - tickGame(gameId) call below
// Pick one name and use it everywhere — mixing `id` and `gameId` causes tickGame(undefined).

// Add these to the hook's existing state declarations:
const [gameStatus, setGameStatus] = useState(null)
const intervalRef = useRef(null)

// Inside useEffect — mirror the existing structure exactly:
// 1. Set isLoading true immediately.
// 2. Fetch the game; only start the interval INSIDE the .then() callback,
//    after data has arrived and state has been set.
// 3. The interval must not start before setGame / setAgentScores have run —
//    starting it outside .then() causes ticks to fire before data loads,
//    leaving agentScores null and the spinner stuck.
useEffect(() => {
  let cancelled = false
  setIsLoading(true)

  fetchGame(gameId).then(g => {
    if (cancelled) return
    setGame(g)
    setAgentScores(g ? structuredClone(g.scores) : null)
    setIsLoading(false)

    // Start the tick interval only after initial data has loaded.
    intervalRef.current = setInterval(async () => {
      try {
        const result = await tickGame(gameId)   // gameId — NOT `id`
        setAgentScores(result.scores)           // update from server response, not local mutation
        if (result.completed === true) {
          clearInterval(intervalRef.current)
          setGameStatus('completed')
        }
      } catch (err) {
        console.error('tick failed', err)
      }
    }, 2000)
  })

  // The useEffect cleanup MUST clear the interval and cancel the fetch
  // to prevent state updates after unmount:
  return () => {
    cancelled = true
    clearInterval(intervalRef.current)
  }
}, [gameId])  // <-- dependency array uses `gameId`, not `id`
```

The exact state setter names (`setAgentScores`, `setGame`, `setIsLoading`) should
match the existing state variables in `useGame.js`. The key points are:
- Set `setIsLoading(true)` at the top of the effect, before the fetch.
- Start the interval INSIDE `.then()` after state is set — not at the top level
  of the effect. Starting it before data arrives keeps `isLoading` true forever
  because `setIsLoading(false)` is only called inside the `.then()`.
- Use a `cancelled` flag to avoid state updates after the component unmounts.
- The hook parameter must be `gameId` (rename from `id` if needed, update all refs).
- No local score mutation — all score state comes from `result.scores`.
- Use `intervalRef.current` (not a local `const interval`) so the cleanup
  function always references the current interval id.
- Always return a cleanup function from `useEffect` that calls
  `clearInterval(intervalRef.current)`.
- Check `result.completed === true` (strict equality) before clearing.

**Return `gameStatus` from `useGame.js`** alongside the other returned values.
In `GameView.jsx` (or wherever the status badge is rendered), use:
```js
const displayStatus = gameStatus ?? game?.status
```
so the badge shows `'completed'` as soon as the tick response arrives, without
waiting for a separate `fetchGame` round-trip.

### `src/components/dashboard/RecentResults.jsx` — required change

The component currently calls `result.habitableScore.toFixed(1)` which crashes
with a TypeError when `habitableScore` is null (games with no in-zone winner).
The server-side `recent.js` already skips those games, but the client must also
guard because a stale cached response could contain null values.

**File to modify:** `src/components/dashboard/RecentResults.jsx`

Change every occurrence of:
```jsx
result.habitableScore.toFixed(1)
```
to:
```jsx
result.habitableScore != null ? Number(result.habitableScore).toFixed(1) : '—'
```

Do NOT coerce `habitableScore` to `0` in `client.js` — that hack hides the
null and makes `'0.0'` display instead of a meaningful dash. Let it stay null
and render the dash in the component where it is displayed.

### Import site changes

Find every file that imports from `../api/mock.js` (or `./api/mock.js`) and
replace the import path with `../api/client.js` (or `./api/client.js`).

Use this search to locate all import sites:

```bash
grep -r "from.*api/mock" src/
```

Expected files to update (based on current project structure):
- `src/hooks/useLiveStats.js`
- `src/hooks/useGame.js` (import path change + interval logic change — see above)
- `src/pages/Dashboard.jsx`
- `src/pages/GameView.jsx` (imports `PERSONAS` from `../../api/mock` — update to `../../api/client`)
- `src/components/dashboard/RecentResults.jsx` (import path change + null guard — see above)
- `src/components/dashboard/GameCard.jsx` (imports `PERSONAS` from `../../api/mock` — update to `../../api/client`)
- `src/components/dashboard/LeaderboardSidebar.jsx` (imports `PERSONAS` from `../../api/mock` — update to `../../api/client`)
- `src/components/game/ScorePanel.jsx` (imports `PERSONAS` from `../../api/mock` — update to `../../api/client`)
- Any other component that calls `createGame`, `fetchGames`, `fetchLeaderboard`, `fetchRecent`

Note: `client.js` already exports `PERSONAS` as a named constant (see the `export const PERSONAS` block
in `src/api/client.js` above). No additional change to `client.js` is needed — the export is already
there, just sourced from the constant definition in `client.js` rather than from `mock.js`.

---

## H. `package.json` — New Scripts and Dependencies

### New runtime dependencies

```
express          # HTTP server
cors             # CORS middleware
mysql2           # MySQL-compatible client (works with Dolt)
dotenv           # .env loading
nanoid           # already present; also needed server-side
```

### New dev dependencies

```
nodemon          # auto-restart Express on file change
concurrently     # run Vite + Express + Dolt in one terminal
```

### Install commands

```bash
npm install express cors mysql2 dotenv
npm install --save-dev nodemon concurrently
```

### Updated `scripts` block in `package.json`

```json
{
  "scripts": {
    "dev":      "vite",
    "build":    "vite build",
    "lint":     "eslint .",
    "preview":  "vite preview",
    "test":     "vitest run",
    "server":   "nodemon server/index.js",
    "dolt":     "/opt/homebrew/bin/dolt sql-server --port 3307 --host 127.0.0.1 --data-dir ~/Desktop/donut-game-db --max-connections=50",
    "dev:full": "concurrently --names 'vite,express,dolt' --prefix-colors 'cyan,green,yellow' 'npm run dev' 'npm run server' 'npm run dolt'"
  }
}
```

Note: `package.json` must keep `"type": "module"` because the React/Vite side
uses ESM. The Express server files must also use ESM syntax (`import`/`export`),
which is why all `server/` files use `import` (not `require`).

---

## I. Environment Config

### `.env` (in project root, **not** committed to git)

```
# Dolt SQL server
DOLT_HOST=127.0.0.1
DOLT_PORT=3307
DOLT_USER=root
DOLT_PASSWORD=
DOLT_DATABASE=donut_game

# Express
SERVER_PORT=3001
```

### `.env.example` (committed, for documentation)

```
DOLT_HOST=127.0.0.1
DOLT_PORT=3307
DOLT_USER=root
DOLT_PASSWORD=
DOLT_DATABASE=donut_game
SERVER_PORT=3001
```

### Vite env for frontend

Add to `.env` (Vite exposes `VITE_` prefixed vars):

```
VITE_API_BASE=http://localhost:3001
```

Add `.env` to `.gitignore` if not already present:

```
.env
```

---

## Implementation Order

Execute these steps in sequence to avoid dependency issues:

1. **Install packages** — `npm install express cors mysql2 dotenv && npm install --save-dev nodemon concurrently`
2. **Create `.env` and `.env.example`**
3. **Create `scripts/init-dolt.sh`** and make executable
4. **Run `scripts/init-dolt.sh`** to bootstrap the Dolt repo at `~/Desktop/donut-game-db`
5. **Create `server/db.js`**
6. **Create `server/routes/datasets.js`**
7. **Create `server/routes/leaderboard.js`**
8. **Create `server/routes/recent.js`**
9. **Create `server/routes/stats.js`**
10. **Create `server/routes/games.js`**
11. **Create `server/routes/tick.js`**
12. **Create `server/routes/finish.js`**
13. **Create `server/routes/diff.js`**
14. **Create `server/index.js`**
15. **Update `package.json` scripts**
16. **Create `src/api/client.js`**
17. **Update `src/hooks/useGame.js`** — replace interval random walk with `tickGame` calls (see section G)
18. **Update all other `mock.js` import sites** to `client.js`
19. **Smoke test**: `npm run dolt` in one terminal, `npm run server` in another, `npm run dev` in a third — or `npm run dev:full` for all three at once

---

## Key Design Decisions

### Branch isolation per request
Dolt's SQL server is MySQL-compatible but stores branch context per connection.
A connection pool would share context unpredictably across concurrent requests.
The `withBranch(branch, fn)` helper in `db.js` opens a fresh connection,
checks out the branch, runs the operation, and always closes the connection
(even on error) via the `finally` block.

### Commit on main before branching
Agent branches must fork from a committed main. Rows inserted but not yet
committed on main do not exist on the forked branch's history — so foreign key
constraints that reference `games(id)` or `agents(id)` will fail on the agent
branch. The game creation route therefore: inserts all rows, calls
`CALL DOLT_ADD('.')` and `CALL DOLT_COMMIT('-m', ...)` on main, then creates
the branches.

### DOLT_COMMIT argument format
All `DOLT_COMMIT` calls must use the two-argument form:
```sql
CALL DOLT_COMMIT('-m', ?)
```
with the message as the bound parameter. The form `CALL DOLT_COMMIT(?)` is
incorrect and will fail.

### Main branch as the global index
All tables (`games`, `agents`, `agent_scores`) are written to the main branch
too. This makes cross-agent queries (stats, leaderboard, recent) simple — no
need to merge branches. Agent branches hold the per-agent audit trail; main
holds the aggregate view.

### Leaderboard population
The `leaderboard` table is populated by `finishGame()` which is triggered
automatically when **all** agents reach `iteration >= 10` (checked via
`Math.min(...iterations) >= 10`) inside the tick route. It can also be triggered
manually via `POST /api/games/:id/finish`. Without this, `GET /api/leaderboard`
would always return an empty array.

The `username` field in `leaderboard` comes from `games.username` (set when
`POST /api/games` is called), not from the winning `persona_id`. The `games`
table now has a `username VARCHAR(64) NOT NULL DEFAULT 'anonymous'` column.

### Sequential agent ticks (connection exhaustion prevention)
The tick route processes agents with a `for...of` loop — NOT `Promise.all`.
Running agents in parallel would open 2 × numAgents TCP connections at once
(one `withBranch(agentBranch)` + one `withBranch('main')` per agent). With 10
agents that is 20 simultaneous connections per tick call. Sequential execution
caps peak connections at 2 regardless of agent count. The pool is configured
with `connectionLimit: 10` and the Dolt server is started with
`--max-connections=50` to accommodate concurrent HTTP requests without
exhausting the server's connection limit.

### Same-connection rule for DOLT_ADD/DOLT_COMMIT
`DOLT_ADD` and `DOLT_COMMIT` must always be called on the **same database
connection** that performed the preceding inserts/updates. Each connection in
Dolt's SQL server has its own working-set staging area. If you insert rows on
connection A (e.g. the pool) and then call `DOLT_ADD` on connection B (a
freshly opened connection), connection B's staging area is empty and nothing
is committed. The fix: use `withBranch('main', async conn => { /* inserts +
DOLT_ADD + DOLT_COMMIT all on conn */ })` for every write-then-commit sequence.

### habitable_score derivation
`habitable_score = (social_score + planetary_score) / 2`. Stored in the DB
(not derived at query time) so diffs show the exact value that was committed.
`is_in_zone = 1` when `social_score >= 60 AND planetary_score >= 60`.

### Commit message format
```
{personaId} iteration {n}: social={x} (+/-delta) planetary={y} (+/-delta) habitable={z}
```
This format is human-readable in `dolt log` and machine-parseable if needed later.

### DoltHub readiness
- All tables have `VARCHAR(36)` primary keys (nanoid output fits; UUID also works).
- No auto-increment integers (avoids merge conflicts on DoltHub).
- Foreign keys declared (Dolt supports them; enforced on push).
- `datasets` table is pre-seeded with real dataset names for credibility.

---

## Dolt SQL Cheatsheet (for debugging)

```sql
-- List branches
SELECT * FROM dolt_branches;

-- Switch to agent branch
CALL DOLT_CHECKOUT('agent/scientist-01');

-- See recent commits
SELECT commit_hash, message, date FROM dolt_log LIMIT 5;

-- See what changed in last commit
-- NOTE: the column is `to_commit`, NOT `to_commit_hash`
SELECT * FROM dolt_diff_agent_scores WHERE to_commit = (
  SELECT commit_hash FROM dolt_log LIMIT 1
);

-- Merge agent branch back to main (future feature)
CALL DOLT_CHECKOUT('main');
CALL DOLT_MERGE('agent/scientist-01');
```
