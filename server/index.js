import express        from 'express'
import cors           from 'cors'
import dotenv         from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync }    from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
import datasetsRouter    from './routes/datasets.js'
import gamesRouter       from './routes/games.js'
import tickRouter        from './routes/tick.js'
import finishRouter      from './routes/finish.js'
import diffRouter        from './routes/diff.js'
import leaderboardRouter from './routes/leaderboard.js'
import recentRouter      from './routes/recent.js'
import statsRouter       from './routes/stats.js'
import insightRouter     from './routes/insight.js'

dotenv.config()

const app  = express()
const PORT = process.env.SERVER_PORT ?? 3001

// PROTOTYPE LIMITATION (issue 12): CORS_ORIGIN only accepts a single origin string.
// For multi-origin support, pass an array or a function to cors({ origin: ... }).
app.use(cors({ origin: process.env.CORS_ORIGIN ?? true }))
app.use(express.json({ limit: '16kb' }))

app.use('/api/datasets',     datasetsRouter)
app.use('/api/games',        gamesRouter)
app.use('/api/games',        tickRouter)
app.use('/api/games',        finishRouter)
app.use('/api/games',        diffRouter)
app.use('/api/leaderboard',  leaderboardRouter)
app.use('/api/recent',       recentRouter)
app.use('/api/stats',        statsRouter)
app.use('/api/games',        insightRouter)

// Serve built frontend (production / sharing mode)
const distPath = join(process.cwd(), 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/{*path}', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => console.log(`Express listening on :${PORT}`))
