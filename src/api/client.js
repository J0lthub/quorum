const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `GET ${path} failed: ${res.status}`)
  }
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const respBody = await res.json().catch(() => ({}))
    throw new Error(respBody.error ?? `POST ${path} failed: ${res.status}`)
  }
  return res.json()
}

// ─── snake_case → camelCase helpers ────────────────────────────────────────

export { mapLeaderboardRow } from './mappers.js'

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
  // The server's /api/recent route already returns camelCase fields:
  // id, question, winningPersona, habitableScore, commitHash, diffUrl
  return get('/api/recent')
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
