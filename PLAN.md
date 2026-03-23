# The Donut Game — Implementation Plan

Branch: `build-dashboard-persona-habitable-zone`
Stack: React 19 + Vite 8, React Router v6, plain CSS modules (no external UI lib)
Scope: Dashboard `/`, Persona Selection modal, Habitable Zone ring on `/game/:id`

---

## 0. Dependency install (first step before any code)

```
npm install --save react-router-dom nanoid
```

The `--save` flag (default in npm 5+ but stated explicitly for clarity) ensures
both packages are written to `dependencies` in `package.json`. Verify after
install: `package.json` must list both so a fresh `npm install` on a clean checkout
resolves the packages without manual intervention.

`nanoid` is required by `createGame` in `src/api/mock.js` to generate collision-safe
URL-friendly ids for new game objects and their agent descriptors. All other
dependencies are provided by React + Vite. All visuals are SVG/CSS. All data is mocked.

---

## 1. File & Folder Structure

Replace the scaffold. Final tree:

```
src/
  main.jsx                        # mount + BrowserRouter
  App.jsx                         # Routes only
  index.css                       # global reset + CSS custom properties (design tokens)

  api/
    mock.js                       # all mock data + simulated async helpers

  hooks/
    useLiveStats.js               # polls/simulates live dashboard stats
    useGame.js                    # game state + scoring engine

  pages/
    Dashboard.jsx                 # route /
    GameView.jsx                  # route /game/:id

  components/
    layout/
      TopBar.jsx                  # platform name, live stat chips
    dashboard/
      QuestionInput.jsx           # hero Cursor-style textarea + submit
      ActiveGamesGrid.jsx         # grid of GameCard
      GameCard.jsx                # single active-game card
      RecentResults.jsx           # horizontal strip of last 5 completed games
      LeaderboardSidebar.jsx      # top-10 humans sidebar
    persona/
      PersonaModal.jsx            # modal shell + 2–5 selection logic
      PersonaCard.jsx             # single selectable persona card
    game/
      HabitableZoneRing.jsx       # SVG Cartesian plot + agent points + threshold lines
      AgentPointLegend.jsx        # colored legend for active agents
      ScorePanel.jsx              # numeric score breakdown per agent
```

---

## 2. Design Tokens (`src/index.css`)

**Important:** Before writing the new token content, delete the following scaffold
files entirely: `src/App.css`. Also wipe `src/index.css` and replace it wholesale
with the content below. The Vite scaffold places opinionated styles on `#root`
(including `width: 1126px`, `text-align: center`, and flex layout) and on `h1`/`h2`
elements. The full reset block below neutralizes all of those.

All color, spacing, and typography in CSS custom properties on `:root`. No values
hard-coded inside component files.

```css
/* === Full CSS reset — must come before all other rules === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-base);
  color: var(--color-text);
  font-family: var(--font-sans);
}

/* Neutralize Vite scaffold #root styles */
#root {
  width: 100%;
  max-width: 100%;
  text-align: left;
  display: block;
  margin: 0;
  padding: 0;
}

/* Reset heading sizes so CSS Modules control them */
h1, h2, h3, h4, h5, h6 {
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
}

/* === Design tokens === */
:root {
  --bg-base:       #0d0f0e;
  --bg-surface:    #141714;
  --bg-elevated:   #1c201b;

  --color-amber:   #c8892a;
  --color-amber-dim: #7a5118;
  --color-green:   #4caf6e;
  --color-green-dim: #2a5e3c;
  --color-text:    #e8e4dc;
  --color-muted:   #6b7068;
  --color-border:  #2a2e29;

  --font-mono: "JetBrains Mono", "Fira Mono", ui-monospace, monospace;
  --font-sans: "Inter", system-ui, sans-serif;

  --ring-outer-stroke: var(--color-amber);
  --ring-inner-stroke: var(--color-green);
  --ring-fill:         rgba(76, 175, 110, 0.20);
}
```

### 2a. Google Fonts — add to `index.html`

Add the following `<link>` tags inside `<head>` of `index.html` as the **last
elements before the closing `</head>` tag**. (Vite's `index.html` does not
contain a `<link rel="stylesheet" href="/src/index.css" />` entry — CSS is
injected at runtime via the module script, so there is no CSS link to insert
before. Place the font links at the end of `<head>` instead.)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

Both `Inter` (weights 400 and 500) and `JetBrains Mono` (weights 400, 500, and 700)
are loaded in a single stylesheet request. Inter is used for `--font-sans` (body
text, labels, UI chrome); JetBrains Mono is used for `--font-mono` (usernames,
commit hashes, score numbers). Inter is not a system font on most platforms, so it
must be loaded explicitly — without this link `--font-sans` would fall back to
`system-ui` and the typographic aesthetic would be inconsistent across OS.

---

## 3. Mock Data (`src/api/mock.js`)

### 3a. Personas (all 13 defined in spec)

```js
export const PERSONAS = [
  { id: 'scientist',          name: 'Scientist',               color: '#5b8dd9', icon: '🔬', blurb: 'Hypothesis-driven. Weights statistical significance.',   priorities: ['evidence','significance','replication'] },
  { id: 'engineer',           name: 'Engineer',                color: '#e07b39', icon: '⚙️', blurb: 'Pragmatic and constraint-aware. Optimizes for feasibility.', priorities: ['feasibility','cost','buildability'] },
  { id: 'industrial_designer',name: 'Industrial Designer',     color: '#9b6dd6', icon: '✏️', blurb: 'Systems thinker. Weights user experience and elegant redesign.', priorities: ['UX','systems','elegance'] },
  { id: 'mathematician',      name: 'Mathematician',           color: '#d4c44a', icon: '∑',  blurb: 'Pure optimization. Finds the most efficient path to metrics.', priorities: ['efficiency','optimality','precision'] },
  { id: 'journalist',         name: 'Journalist',              color: '#e05c5c', icon: '✍️', blurb: 'Follows the human story. Weights equity and social impact.',    priorities: ['equity','narrative','scrutiny'] },
  { id: 'commons_steward',    name: 'Commons Steward',         color: '#4db3a0', icon: '🤝', blurb: 'Prioritizes shared resources. Asks: who owns this?',           priorities: ['commons','collective','governance'] },
  { id: 'regenerative_econ',  name: 'Regenerative Economist',  color: '#7cc47c', icon: '♻️', blurb: 'Thinks in circular systems. Waste is always an input.',        priorities: ['circularity','lifecycle','waste'] },
  { id: 'equity_analyst',     name: 'Social Equity Analyst',   color: '#e87fac', icon: '⚖️', blurb: 'Scores every solution by who it helps least.',                priorities: ['equity','bottom20%','access'] },
  { id: 'planetary_bounds',   name: 'Planetary Boundaries',    color: '#64b5f6', icon: '🌍', blurb: 'Hard ceiling enforcer. Will reject overshoot solutions.',      priorities: ['ceilings','thresholds','hard-limits'] },
  { id: 'care_economy',       name: 'Care Economy Advocate',   color: '#f48fb1', icon: '💙', blurb: 'Surfaces unpaid labor and community work GDP ignores.',        priorities: ['care','invisible-labor','community'] },
  { id: 'urban_ecologist',    name: 'Urban Ecologist',         color: '#81c784', icon: '🌿', blurb: 'Finds where city systems meet living systems.',                priorities: ['biodiversity','green-infra','habitat'] },
  { id: 'degrowth',           name: 'Degrowth Strategist',     color: '#ffb74d', icon: '📉', blurb: 'The provocateur. Asks: what if the solution is less?',         priorities: ['degrowth','sufficiency','challenge'] },
  { id: 'indigenous',         name: 'Indigenous Knowledge',    color: '#a1887f', icon: '🌄', blurb: 'Long-horizon thinking. Place-based wisdom.',                   priorities: ['place','long-horizon','wisdom'] },
]
```

### 3b. Mock games and leaderboard entries

**MOCK_GAMES** — 4–6 active game objects. Each entry must conform to this exact
schema (components must not invent their own field names):

```js
// MOCK_GAMES entry schema
{
  id: 'g-001',                      // string — used as React key and route param
  question: 'What is the best way to reduce carbon emissions in NYC?',
  agents: [                         // array of agent descriptors
    { id: 'a-001', personaId: 'scientist',        branch: 'scientist-v1',        iteration: 1 },
    { id: 'a-002', personaId: 'engineer',         branch: 'engineer-v1',         iteration: 1 },
    { id: 'a-003', personaId: 'planetary_bounds', branch: 'planetary-bounds-v1', iteration: 1 },
  ],
  scores: {                         // keyed by agent id (not personaId)
    'a-001': { social: 72, planetary: 81 },
    'a-002': { social: 68, planetary: 74 },
    'a-003': { social: 61, planetary: 92 },
  },
  status: 'active',                 // 'active' | 'complete'
  startedAt: '2026-03-23T10:14:00Z',
}
```

**MOCK_RECENT** — 5 completed game summaries. Each entry must conform to:

```js
// MOCK_RECENT entry schema
{
  id: 'r-001',
  question: 'How can urban transit reduce car dependency by 2035?',
  winningPersona: 'urban_ecologist',    // personaId of highest in-zone scorer
  habitableScore: 78.5,                 // (social + planetary) / 2 of winner
  commitHash: 'a3f9c12',               // 7-char short hash
  diffUrl: '#',                         // href for diff link (# in prototype)
}
```

**MOCK_LEADERBOARD** — 10 user entries. Each entry must conform to:

```js
// MOCK_LEADERBOARD entry schema
{
  rank: 1,
  username: 'ecotopia42',
  bestScore: 91.0,
  winningPersona: 'regenerative_econ',  // personaId
  question: 'Can doughnut economics replace GDP as a policy target?',
  dataset: 'ONS-2024',
  date: '2026-03-20',
  commitHash: 'b7d2e45',
}
```

```js
export const MOCK_GAMES = [
  {
    id: 'g-001',
    question: 'What is the best way to reduce carbon emissions in NYC?',
    agents: [
      { id: 'a-001', personaId: 'scientist',        branch: 'agent/scientist-01',        iteration: 0 },
      { id: 'a-002', personaId: 'engineer',          branch: 'agent/engineer-01',          iteration: 0 },
      { id: 'a-003', personaId: 'planetary_bounds',  branch: 'agent/planetary_bounds-01',  iteration: 0 },
    ],
    scores: {
      'a-001': { social: 72, planetary: 81 },
      'a-002': { social: 68, planetary: 74 },
      'a-003': { social: 61, planetary: 92 },
    },
    status: 'active',
    startedAt: '2026-03-23T10:14:00Z',
  },
  {
    id: 'g-002',
    question: 'How can universal basic income reshape care work in high-income countries?',
    agents: [
      { id: 'a-004', personaId: 'care_economy',   branch: 'agent/care_economy-01',   iteration: 0 },
      { id: 'a-005', personaId: 'equity_analyst',  branch: 'agent/equity_analyst-01',  iteration: 0 },
      { id: 'a-006', personaId: 'degrowth',        branch: 'agent/degrowth-01',        iteration: 0 },
      { id: 'a-007', personaId: 'mathematician',   branch: 'agent/mathematician-01',   iteration: 0 },
    ],
    scores: {
      'a-004': { social: 84, planetary: 63 },
      'a-005': { social: 79, planetary: 58 },
      'a-006': { social: 55, planetary: 71 },
      'a-007': { social: 66, planetary: 69 },
    },
    status: 'active',
    startedAt: '2026-03-23T09:02:00Z',
  },
  {
    id: 'g-003',
    question: 'Can regenerative agriculture feed Europe without synthetic fertilizers by 2040?',
    agents: [
      { id: 'a-008', personaId: 'regenerative_econ', branch: 'agent/regenerative_econ-01', iteration: 0 },
      { id: 'a-009', personaId: 'indigenous',         branch: 'agent/indigenous-01',         iteration: 0 },
      { id: 'a-010', personaId: 'journalist',         branch: 'agent/journalist-01',         iteration: 0 },
    ],
    scores: {
      'a-008': { social: 77, planetary: 88 },
      'a-009': { social: 70, planetary: 82 },
      'a-010': { social: 65, planetary: 60 },
    },
    status: 'active',
    startedAt: '2026-03-23T08:45:00Z',
  },
  {
    id: 'g-004',
    question: 'What urban design interventions most effectively reduce heat-island effect?',
    agents: [
      { id: 'a-011', personaId: 'urban_ecologist',      branch: 'agent/urban_ecologist-01',      iteration: 0 },
      { id: 'a-012', personaId: 'industrial_designer',  branch: 'agent/industrial_designer-01',  iteration: 0 },
      { id: 'a-013', personaId: 'commons_steward',      branch: 'agent/commons_steward-01',      iteration: 0 },
    ],
    scores: {
      'a-011': { social: 80, planetary: 85 },
      'a-012': { social: 74, planetary: 78 },
      'a-013': { social: 62, planetary: 70 },
    },
    status: 'active',
    startedAt: '2026-03-23T07:30:00Z',
  },
  {
    id: 'g-005',
    question: 'How should cities price road access to cut congestion and fund transit equitably?',
    agents: [
      { id: 'a-014', personaId: 'equity_analyst',  branch: 'agent/equity_analyst-01',  iteration: 0 },
      { id: 'a-015', personaId: 'engineer',         branch: 'agent/engineer-01',         iteration: 0 },
      { id: 'a-016', personaId: 'commons_steward',  branch: 'agent/commons_steward-01',  iteration: 0 },
    ],
    scores: {
      'a-014': { social: 88, planetary: 66 },
      'a-015': { social: 71, planetary: 73 },
      'a-016': { social: 57, planetary: 64 },
    },
    status: 'active',
    startedAt: '2026-03-23T06:55:00Z',
  },
]

export const MOCK_RECENT = [
  {
    id: 'r-001',
    question: 'How can urban transit reduce car dependency by 2035?',
    winningPersona: 'urban_ecologist',
    habitableScore: 78.5,
    commitHash: 'a3f9c12',
    diffUrl: '#',
  },
  {
    id: 'r-002',
    question: 'Can doughnut economics replace GDP as a policy target?',
    winningPersona: 'regenerative_econ',
    habitableScore: 91.0,
    commitHash: 'b7d2e45',
    diffUrl: '#',
  },
  {
    id: 'r-003',
    question: 'What role should land value tax play in affordable housing policy?',
    winningPersona: 'commons_steward',
    habitableScore: 74.2,
    commitHash: 'c1e8f03',
    diffUrl: '#',
  },
  {
    id: 'r-004',
    question: 'How do we close the global digital divide without deepening extraction?',
    winningPersona: 'equity_analyst',
    habitableScore: 82.7,
    commitHash: 'd4a6b19',
    diffUrl: '#',
  },
  {
    id: 'r-005',
    question: 'Is a four-day work week compatible with planetary boundaries?',
    winningPersona: 'degrowth',
    habitableScore: 69.4,
    commitHash: 'e9c3d77',
    diffUrl: '#',
  },
]

export const MOCK_LEADERBOARD = [
  { rank: 1,  username: 'ecotopia42',    bestScore: 91.0, winningPersona: 'regenerative_econ', question: 'Can doughnut economics replace GDP as a policy target?',                     dataset: 'ONS-2024',       date: '2026-03-20', commitHash: 'b7d2e45' },
  { rank: 2,  username: 'kaiawhenuā',    bestScore: 88.3, winningPersona: 'indigenous',         question: 'Can regenerative agriculture feed Europe without synthetic fertilizers?',    dataset: 'FAOSTAT-2024',   date: '2026-03-21', commitHash: 'f2a1c88' },
  { rank: 3,  username: 'loop_logic',    bestScore: 86.1, winningPersona: 'urban_ecologist',    question: 'What urban design interventions reduce heat-island effect most?',            dataset: 'C40-Cities-23',  date: '2026-03-19', commitHash: '3d7e021' },
  { rank: 4,  username: 'thrivelab',     bestScore: 84.5, winningPersona: 'care_economy',       question: 'How can universal basic income reshape care work in high-income countries?', dataset: 'ILO-2023',       date: '2026-03-18', commitHash: '9b5f44a' },
  { rank: 5,  username: 'marginalcost',  bestScore: 82.7, winningPersona: 'equity_analyst',     question: 'How do we close the global digital divide without deepening extraction?',    dataset: 'ITU-2024',       date: '2026-03-22', commitHash: 'd4a6b19' },
  { rank: 6,  username: 'steadystate',   bestScore: 80.9, winningPersona: 'degrowth',           question: 'Is a four-day work week compatible with planetary boundaries?',             dataset: 'Eurostat-2024',  date: '2026-03-17', commitHash: '6c0d953' },
  { rank: 7,  username: 'solarfutures',  bestScore: 79.3, winningPersona: 'planetary_bounds',   question: 'What is the best way to reduce carbon emissions in NYC?',                   dataset: 'EPA-2024',       date: '2026-03-16', commitHash: '1e8ba70' },
  { rank: 8,  username: 'commonwealt_h', bestScore: 77.6, winningPersona: 'commons_steward',    question: 'What role should land value tax play in affordable housing policy?',         dataset: 'ONS-2024',       date: '2026-03-15', commitHash: 'c1e8f03' },
  { rank: 9,  username: 'datadonut',     bestScore: 74.8, winningPersona: 'scientist',          question: 'Can biodiversity offsetting actually protect ecosystems long-term?',         dataset: 'IUCN-2024',      date: '2026-03-14', commitHash: '7f3c19d' },
  { rank: 10, username: 'boundarywork',  bestScore: 71.2, winningPersona: 'journalist',         question: 'How should cities price road access to cut congestion equitably?',           dataset: 'TfL-Open-2024',  date: '2026-03-13', commitHash: '4a9e826' },
]

export const MOCK_LIVE_STATS = { activeAgents: 47, totalCommits: 12843, datasets: 31 }
```

### 3c. Async helpers (simulated network)

```js
export async function fetchGames()       // resolves MOCK_GAMES after 120ms
export async function fetchGame(id)      // resolves single game — see lookup order below
export async function fetchLeaderboard() // resolves MOCK_LEADERBOARD
export async function fetchLiveStats()   // resolves MOCK_LIVE_STATS + small random delta
export async function createGame(payload) // transforms input, stores result, resolves new game
```

**`createGame` input/output transformation (full specification):**

The persona modal calls `createGame({ question, agents: selected })` where
`selected` is an array of persona id strings (e.g. `['scientist', 'engineer']`).
`createGame` must transform this into a full game object before resolving:

```js
import { nanoid } from 'nanoid'   // add nanoid to dependencies: npm install nanoid

const LIVE_GAMES = new Map()       // module-level mutable store for in-progress games

export async function createGame({ question, agents: personaIds }) {
  return new Promise(resolve => setTimeout(() => {
    const gameId = nanoid()
    const agentDescriptors = personaIds.map(personaId => ({
      id:        nanoid(),
      personaId,
      branch:    `agent/${personaId}-01`,
      iteration: 0,
    }))
    const scores = {}
    for (const agent of agentDescriptors) {
      scores[agent.id] = {
        social:    55 + Math.random() * 25,   // range [55, 80) — ~75% chance per agent of being in-zone
        planetary: 55 + Math.random() * 25,   // range [55, 80) — makes the habitable zone immediately populated
      }
    }
    const game = {
      id:        gameId,
      question,
      agents:    agentDescriptors,
      scores,
      status:    'active',
      startedAt: new Date().toISOString(),
    }
    LIVE_GAMES.set(gameId, game)
    resolve(game)
  }, 120))
}
```

**`fetchGame` lookup order:** check `LIVE_GAMES` first (games created in the
current session), then fall back to `MOCK_GAMES`. This ensures that a game
created via the modal is immediately fetchable by `useGame(id)` after navigation:

```js
export async function fetchGame(id) {
  return new Promise(resolve => setTimeout(() => {
    if (LIVE_GAMES.has(id)) {
      resolve(LIVE_GAMES.get(id))
    } else {
      resolve(MOCK_GAMES.find(g => g.id === id) ?? null)
    }
  }, 120))
}
```

**`nanoid` dependency:** add it alongside `react-router-dom` in step 1 of the
implementation order: `npm install react-router-dom nanoid`. `nanoid` generates
URL-safe unique ids (21 chars by default) with no collision risk in a prototype
context. Do not use `Math.random()` for ids — it produces non-unique values
under concurrent calls.

---

## 4. Scoring Engine (inside `src/hooks/useGame.js`)

Pure functions, no side effects. Export separately so tests can import them.

```js
// Returns (social + planetary) / 2 if both >= 60, otherwise null (outside zone)
export function computeHabitableScore(social, planetary) {
  if (social < 60 || planetary < 60) return null
  return (social + planetary) / 2
}

// Returns true if agent is inside the habitable zone
export function isInZone(social, planetary) { return social >= 60 && planetary >= 60 }
```

**Note on `computeSocialScore` / `computePlanetaryScore`:** These are intentionally
omitted from the prototype. The mock data provides pre-computed `social` and
`planetary` scores directly on each agent entry (see §3b). The `useGame` hook's
simulation tick perturbs those pre-computed values by ±2 per tick — there are no
raw metrics to aggregate. Adding metric-level computation would require a separate
metrics schema and mock data that are out of scope for this prototype. If a real
scoring pipeline is added later, `computeSocialScore(metrics)` and
`computePlanetaryScore(metrics)` can be introduced alongside the metrics data layer.

---

## 5. Routing (`src/main.jsx` + `src/App.jsx`)

Both `main.jsx` and `App.jsx` must be **fully replaced**. The Vite scaffold
`App.jsx` renders the default Vite welcome page which must be replaced wholesale —
the content (counter demo, Vite/React logos, boilerplate copy) is entirely
incompatible with the new app. Write both files from scratch; do not attempt to
edit around the scaffold.

`main.jsx` — FULL FILE CONTENT (nothing from scaffold survives):

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

`App.jsx` — FULL FILE CONTENT (nothing from scaffold survives):

```jsx
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import GameView  from './pages/GameView'

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Dashboard />} />
      <Route path="/game/:id"  element={<GameView />} />
    </Routes>
  )
}
```

**Why both files must be fully replaced:** The Vite scaffold `main.jsx` does not
wrap the app in `<BrowserRouter>`, causing React Router to throw "You cannot render
a `<Route>` outside a `<Router>`" immediately on load. The scaffold `App.jsx`
renders the default Vite welcome page — a counter demo with Vite/React logos and
boilerplate copy — which is entirely incompatible with the new app structure.
Neither file can be safely edited in-place; write both from scratch.

---

## 6. TopBar Component

Fixed to top. Three live stat chips (activeAgents, totalCommits, datasets) sourced
from `useLiveStats`. Polled every 5 seconds via `setInterval` inside the hook; each
tick applies a small random delta to simulate live agent activity.

Layout (flexbox):
```
[DONUT GAME]          [● 47 agents]  [12,843 commits]  [31 datasets]
```

All numbers animate (CSS transition on opacity when value changes, not a full number
ticker — keep it simple).

---

## 7. Dashboard Page (`src/pages/Dashboard.jsx`)

Three-column CSS grid at 1200 px+, collapses gracefully:

```
┌─────────────────────────────────────┬──────────────────┐
│  QuestionInput (full width, hero)   │                  │
├────────────────────┬────────────────┤  LeaderboardSide │
│  ActiveGamesGrid   │                │  bar             │
│  (2-col card grid) │                │  (10 entries)    │
├────────────────────┴────────────────┤                  │
│  RecentResults (horizontal strip)   │                  │
└─────────────────────────────────────┴──────────────────┘
```

### 7a. QuestionInput

- `<textarea>` that auto-grows (JS resize on input event)
- Placeholder: `"Ask a question about the world..."`
- Submit button: "Start Game →"
- On submit: validate non-empty, open `PersonaModal`
- Hold the pending question in local state, pass to modal

### 7b. ActiveGamesGrid

- 2-column grid of `GameCard` components
- Cards show: truncated question, agent avatar row (colored dots), best score badge,
  elapsed time, "Watch →" link to `/game/:id`
- Shimmer loading state while data fetches

### 7c. GameCard

- Thin top border colored by best-scoring agent's color
- Score badge: green if in zone (>= 60/60), amber if borderline, red if outside
- Subtle "LIVE" pulse indicator if `status === 'active'`

### 7d. RecentResults

- Horizontal scrollable flex row
- Each item: question (truncated to 40 chars), winning persona chip (colored),
  habitable score, "diff" anchor (href="#" for prototype), commit hash (last 7 chars)

### 7e. LeaderboardSidebar

- Ordered list 1–10
- Each row: rank, username (monospace), best score, winning persona color dot
- Amber highlight on rank 1

---

## 8. Persona Selection Modal (`src/components/persona/PersonaModal.jsx`)

Triggered from `QuestionInput` submit. Rendered as a full-screen overlay with a
centered panel (max-width 860px).

State inside modal:
```js
const [selected, setSelected] = useState([]) // array of persona ids, max 5
```

Toggle logic:
- Click to select; click again to deselect
- If already 5 selected and a new one is clicked, do nothing (no-op)
- "Start Game" button disabled until `selected.length >= 2`

### PersonaCard layout (within modal grid, 3-col):
```
┌─────────────────────────────┐
│  [icon]  NAME               │  ← colored left border when selected
│  one-line blurb             │
│  Priorities: tag tag tag    │
└─────────────────────────────┘
```

Selected state: card gets a colored border (persona's `color`), a checkmark badge,
and a subtle background tint. Uses CSS class toggle, no animation library.

"Agent Team" preview row at bottom of modal:
```
Selected agents:  [●Scientist] [●Engineer] [●Planetary Bounds]   [Start Game →]
```

On "Start Game": call `createGame({ question, agents: selected })`, navigate to
`/game/${newGame.id}`.

---

## 9. Habitable Zone Ring (`src/components/game/HabitableZoneRing.jsx`)

Pure SVG, no canvas, no charting library. Responsive via `viewBox`.

### 9a. Coordinate system — Cartesian X/Y axis approach

`viewBox="0 0 500 500"`, with the plot area running from (50,450) at the origin to
(450,50) at the top-right corner. This maps the two independent score dimensions
onto perpendicular axes:

- **X axis (horizontal):** Social Score, 0 → 100, left to right
- **Y axis (vertical):** Planetary Score, 0 → 100, bottom to top (SVG inverted)

Agent point coordinates:
```
x = 50 + (socialScore / 100) * 400
y = 450 - (planetaryScore / 100) * 400
```

This ensures that an agent with `social=60, planetary=60` (the exact zone boundary
per `isInZone`) plots at `x = 290, y = 210` — correctly sitting on the threshold
corner of the habitable quadrant.

**Do not use concentric rings to encode score thresholds.** The annulus geometry
(outer r=200, inner r=110) does not correspond to the zone boundaries in Cartesian
score space: a point at social=60, planetary=60 would plot ~57px from the SVG
center — well inside any inner ring — making the visual misleading.

### 9b. Habitable zone shading

The habitable zone is the **top-right quadrant** where social >= 60 AND
planetary >= 60. Draw it as a filled rectangle:

```jsx
{/* Habitable zone: social 60–100, planetary 60–100 */}
{/* x from 290 to 450, y from 50 to 210 (SVG coordinates) */}
<rect
  x="290" y="50"
  width="160" height="160"
  fill="rgba(76, 175, 110, 0.20)"
  className={styles.habitableZoneFill}
/>
```

Draw threshold lines (dashed) at the zone boundaries:
- Vertical line at x=290 (social score = 60): amber dashed stroke
- Horizontal line at y=210 (planetary score = 60): amber dashed stroke

These lines visually define the zone without misrepresenting which agents are inside.

### 9c. Axes

Draw axes as SVG `<line>` elements:

- Horizontal axis: (50, 450)→(450, 450), label "Social Score →" at right end
- Vertical axis: (50, 450)→(50, 50), label "↑ Planetary Score" at top
- Tick marks at score values 0, 20, 40, 60, 80, 100 on each axis
- Quadrant label (faint, monospace): "IN ZONE" centered in the habitable rectangle

### 9d. Agent points

Each agent is a colored `<circle r="8">` at the coordinates from §9a.
Point has a `<title>` for hover tooltip (native SVG). A larger translucent halo
circle `r="14"` behind it at 40% opacity.

### 9e. Pulse animation on new in-zone best

When `bestScore` improves (i.e. the new value is strictly greater than the
previous value), toggle a React state boolean `isPulsing` to `true`. Track the
previous value with a ref so improvements can be distinguished from decreases:

```jsx
const [isPulsing, setIsPulsing] = useState(false)
const prevBestRef = useRef(null)

useEffect(() => {
  if (bestScore == null) {
    // All agents have left the zone — reset the ref so that the next agent to
    // enter the zone always triggers a pulse (re-entry is treated as a new best).
    prevBestRef.current = null
    return
  }
  if (bestScore > prevBestRef.current) {
    setIsPulsing(true)
  }
  prevBestRef.current = bestScore
}, [bestScore])

// In JSX:
<rect
  ...
  className={`${styles.habitableZoneFill}${isPulsing ? ` ${styles.ringPulse}` : ''}`}
  onAnimationEnd={() => setIsPulsing(false)}
/>
```

The check `bestScore > prevBestRef.current` ensures the pulse fires only when
the score genuinely improves. When `prevBestRef.current` is `null` (first in-zone
agent) the comparison `bestScore > null` evaluates to `true` in JS (null coerces
to 0), which is the correct behaviour — the first in-zone result is itself a
new best. The ref is updated after the check so it always reflects the last
rendered best.

The CSS module defines the keyframe and applies it when `ringPulse` is present:

```css
@keyframes ring-pulse {
  0%   { opacity: 0.20; }
  40%  { opacity: 0.50; }
  100% { opacity: 0.20; }
}

.ringPulse {
  animation: ring-pulse 1.2s ease-out forwards;
}
```

`onAnimationEnd` resets `isPulsing` to `false`, removing the class so the animation
can re-trigger on the next improvement. This approach avoids imperative DOM
manipulation (`classList.add/remove`) and requires no `useRef` on the SVG element
itself.

### 9f. Zone fill — fixed opacity

The habitable zone `<rect>` uses a fixed fill opacity of 0.20:

```jsx
<rect
  x="290" y="50"
  width="160" height="160"
  fill="rgba(76, 175, 110, 0.20)"
  className={styles.habitableZoneFill}
/>
```

Do **not** scale opacity dynamically with `bestScore`. Dynamic opacity via a
`style` prop conflicts with the `ring-pulse` keyframe (§9e), which also controls
opacity — the `style` prop value overrides the animated value mid-animation,
breaking the pulse visual. The zone's spatial extent already communicates its
meaning; the threshold lines (§9b) make the 60/60 boundary explicit. Opacity
scaling is redundant and causes the animation conflict described above.

---

## 10. GameView Page (`src/pages/GameView.jsx`)

Layout: two-column at 1200px+.

```
┌──────────────────────────────┬─────────────────────┐
│  HabitableZoneRing  (center) │  ScorePanel         │
│  (grows to fill available)   │  (per-agent scores) │
│                              │                     │
│  AgentPointLegend (below)    │                     │
└──────────────────────────────┴─────────────────────┘
```

Header above the two-column area: question text (full), status badge, elapsed time.

`useGame(id)` hook:
- Fetches mock game by id on mount
- Sets up `setInterval(2000)` that updates agent scores by ±2 per tick (simulating
  agent progress), re-renders ring
- Returns `{ game, agentScores, bestScore, isLoading }`

---

## 11. ScorePanel (`src/components/game/ScorePanel.jsx`)

Vertical stack, one row per agent:
```
[● color dot]  Scientist              Social: 72  Planetary: 81  Zone: ✓  76.5
```

Highlight the agent with the current best score (amber left border).
Show "BEST" badge next to that agent's name.

---

## 12. Hook Implementation Details

### 12a. `useLiveStats` — interval cleanup

```js
import { useState, useEffect } from 'react'
import { fetchLiveStats } from '../api/mock'

export function useLiveStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false   // guards the initial async fetch against stale resolution

    fetchLiveStats().then(data => {
      if (!cancelled) setStats(data)
    })

    const id = setInterval(() => {
      fetchLiveStats().then(data => {
        if (!cancelled) setStats(data)
      })
    }, 5000)

    return () => {
      cancelled = true     // prevents any in-flight promise from writing into stale state
      clearInterval(id)    // REQUIRED: prevents double-interval in StrictMode
    }
  }, [])

  return stats
}
```

Both the `cancelled` flag and `clearInterval(id)` are required:
- `clearInterval(id)` prevents interval ticks after cleanup, which is the primary
  guard for the repeated poll path.
- `cancelled = true` guards the **initial** `fetchLiveStats()` promise, which
  can resolve after the component unmounts (or is re-mounted by StrictMode). If
  that promise resolved and called `setStats` after unmount, React would log a
  state-update-on-unmounted-component warning. The `if (!cancelled)` check inside
  each `.then` makes both the initial fetch and interval fetches safe.

### 12b. `useGame` — interval cleanup + local score copy

```js
import { useState, useEffect } from 'react'
import { fetchGame } from '../api/mock'

function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)) }

export function useGame(id) {
  const [game, setGame] = useState(null)
  // Local score state — never mutate the MOCK_GAMES constant directly.
  // If agentScores were written back to the shared mock object, every subsequent
  // fetchGame call would return pre-mutated data, breaking navigation back to
  // the dashboard or opening the same game in a new tab.
  const [agentScores, setAgentScores] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Reset to loading state immediately so GameView never shows stale data from
    // a previous game while the new fetch is in-flight (important during navigation).
    setGame(null)
    setAgentScores(null)
    setIsLoading(true)

    let cancelled = false  // cancellation flag guards all setState calls

    fetchGame(id).then(g => {
      if (cancelled) return   // component unmounted or id changed before fetch resolved
      setGame(g)
      setAgentScores(deepCopy(g.scores))  // isolated local copy
      setIsLoading(false)
    })

    const id_interval = setInterval(() => {
      setAgentScores(prev => {
        if (!prev) return prev
        const next = deepCopy(prev)
        for (const agent of Object.keys(next)) {
          next[agent].social    = Math.min(100, Math.max(0, next[agent].social    + (Math.random() * 4 - 2)))
          next[agent].planetary = Math.min(100, Math.max(0, next[agent].planetary + (Math.random() * 4 - 2)))
        }
        return next
      })
    }, 2000)

    // Cleanup: clear the interval and set the flag so any in-flight fetchGame
    // promise that resolves after this cleanup cannot call setState on the
    // unmounted (or re-mounted) component instance.
    // Note: `cancelled` does NOT need to be checked inside the setInterval callback
    // or the setAgentScores functional updater — clearInterval(id_interval) ensures
    // the interval never fires after cleanup. The flag's sole purpose is to guard
    // the async fetchGame().then(...) path above, where a stale promise can resolve
    // after unmount if the network (or simulated delay) outlasts the component.
    return () => {
      cancelled = true
      clearInterval(id_interval)
    }
  }, [id])

  // Derive bestScore only from agents that are IN the habitable zone (social >= 60
  // AND planetary >= 60). Agents outside the zone must not influence bestScore, and
  // if no agent is currently in-zone the result is null (no pulse animation triggered).
  const bestScore = agentScores
    ? (() => {
        const inZoneScores = Object.values(agentScores)
          .filter(s => s.social >= 60 && s.planetary >= 60)
          .map(s => (s.social + s.planetary) / 2)
        return inZoneScores.length > 0 ? Math.max(...inZoneScores) : null
      })()
    : null

  return { game, agentScores, bestScore, isLoading }
}
```

Key invariants enforced here:
1. `agentScores` is initialized from `deepCopy(g.scores)` — the shared `MOCK_GAMES`
   constant is never touched after the initial fetch.
2. The interval updater uses the functional form of `setAgentScores` to avoid
   stale closures.
3. `cancelled = true` plus `clearInterval` are both returned from the effect.
   - `clearInterval(id_interval)` prevents the interval from firing after cleanup;
     no `cancelled` check is needed inside the interval callback or the
     `setAgentScores` functional updater — that would be unreachable dead code.
   - `cancelled = true` guards solely against stale `fetchGame` promises: if the
     component unmounts (or `id` changes) while an async fetch is in-flight, the
     `.then(g => { if (cancelled) return ... })` guard prevents the resolved data
     from being written into the new (or unmounted) component instance. This is a
     real hazard in React StrictMode, which unmounts and remounts every component
     on initial dev render, and during navigation when `id` changes mid-fetch.
4. `bestScore` is derived only from in-zone agents (social >= 60 AND planetary >= 60);
   out-of-zone agents do not contribute, and `null` is returned when no agent is
   in-zone so the pulse animation is not triggered spuriously.

---

## 13. Implementation Order (sequential, each is a shippable increment)

1. **Install deps** — `npm install --save react-router-dom nanoid`; verify `package.json`
   lists both under `dependencies`
2. **Wipe scaffold** — delete `src/App.css`; replace `src/index.css` wholesale with
   the full reset + token CSS from §2; **FULLY REPLACE `src/App.jsx`** with the
   routing skeleton below — do not merely edit the boilerplate, because the Vite
   scaffold `App.jsx` renders the default Vite welcome page (counter demo, Vite/React
   logos, boilerplate copy) which is entirely incompatible with the new app structure.
   Nothing from the original scaffold file should survive:

   ```jsx
   // src/App.jsx — complete replacement, no scaffold lines survive
   import { Routes, Route } from 'react-router-dom'
   import Dashboard from './pages/Dashboard'
   import GameView  from './pages/GameView'

   export default function App() {
     return (
       <Routes>
         <Route path="/"         element={<Dashboard />} />
         <Route path="/game/:id" element={<GameView />} />
       </Routes>
     )
   }
   ```

3. **Add Google Fonts to `index.html`** — insert the Inter + JetBrains Mono `<link>`
   tags (single combined stylesheet URL, see §2a) as the last elements inside `<head>`,
   before `</head>`, so both `--font-sans` (Inter) and `--font-mono` (JetBrains Mono)
   resolve on first paint
4. **Routing skeleton** — **FULLY REPLACE `src/main.jsx`** with the complete content
   from §5 (wraps `<App />` in `<StrictMode><BrowserRouter>`); **FULLY REPLACE
   `src/App.jsx`** with the routing skeleton from §5 (two routes); add stub
   `Dashboard` and `GameView` pages that render `<h1>` placeholders. The app will
   crash with "You cannot render a `<Route>` outside a `<Router>`" if `BrowserRouter`
   is missing from `main.jsx`.
5. **Mock API layer** — `src/api/mock.js` with all data + async helpers
6. **TopBar** — fixed header with live stats via `useLiveStats` hook (including
   `clearInterval` cleanup per §12a)
7. **Dashboard layout** — CSS grid shell with three named areas, no content yet
8. **QuestionInput** — auto-grow textarea, submit handler opens modal (modal stub)
9. **ActiveGamesGrid + GameCard** — fetch mock games, render grid
10. **RecentResults** — horizontal strip from mock data
11. **LeaderboardSidebar** — ordered list from mock data
12. **PersonaCard** — single card component, selection state
13. **PersonaModal** — full modal with all 13 personas, 2–5 constraint, team preview,
    "Start Game" integration
14. **HabitableZoneRing** — SVG Cartesian component, static first (hardcoded test
    scores); verify that social=60, planetary=60 lands exactly on the threshold lines
15. **useGame hook + GameView wiring** — live score simulation with proper interval
    cleanup and local score copy (§12b); ring reacts to state
16. **ScorePanel + AgentPointLegend** — complete the game view
17. **Pulse animation** — add `ring-pulse` keyframe and trigger logic
18. **Polish pass** — monospace font, hover states, loading shimmer, responsive CSS

---

## 14. CSS Approach

- One global `index.css` for tokens, reset, and typography (including full `#root`
  and heading resets to neutralize Vite scaffold defaults)
- Each component imports a co-located `.module.css` file (CSS Modules)
- No Tailwind, no styled-components — keeps the build light and reviewable
- Grid and flexbox only (no float, no absolute except overlays)
- All color references go through custom properties, never hardcoded hex inside modules

---

## 15. What is NOT in scope (prototype deferral)

- `/leaderboard` and `/datasets` routes — nav links present but routes 404
- Real Dolt API integration (all endpoints mocked)
- Auth / user accounts
- Actual diff viewer
- Accessibility audit (ARIA roles added but not exhaustively tested)
- Mobile breakpoints below 768px

---

## 16. Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| `npm install --save react-router-dom` | Explicit save ensures `package.json` is updated for fresh installs |
| Full CSS reset including `#root` and `h1`/`h2` | Vite scaffold injects opinionated styles that collide with CSS Modules |
| Google Fonts `<link>` before `</head>` (not before a CSS link) | Vite's `index.html` has no `<link rel="stylesheet">` for `index.css` — CSS is injected by the module script; inserting before `</head>` is the correct anchor |
| Full replacement of `App.jsx` (not edit/wipe) | The scaffold `App.jsx` renders the default Vite welcome page which is entirely incompatible with the new app — a fresh write is the only safe approach |
| Explicit field schemas for MOCK_GAMES, MOCK_RECENT, MOCK_LEADERBOARD | Without canonical field names, each component invents its own, making the "clean Dolt swap-in" goal impossible |
| Cartesian X/Y axes for Habitable Zone (not concentric rings) | Concentric ring geometry does not map correctly to the social/planetary score thresholds; a point at exactly score=60 on both axes would fall far inside the inner ring (r=110) rather than on its boundary |
| `clearInterval` + `cancelled` flag in `useGame` `useEffect` | `cancelled` guards only the async `fetchGame` promise path — a stale promise can resolve after unmount and overwrite state in the new instance. `clearInterval` alone prevents interval ticks after cleanup; no `cancelled` check is needed inside the interval callback |
| `isPulsing` boolean state for ring-pulse (not imperative `classList`) | Using React state + `onAnimationEnd` to toggle the CSS class is simpler and idiomatic; imperative `classList.add/remove` would require a `useRef` on the SVG element and mismatches React's rendering model |
| `BrowserRouter` wraps `<App>` in `main.jsx` (not in `App.jsx`) | `<Routes>` and `<Route>` must be descendants of a `<Router>`; placing `BrowserRouter` in `main.jsx` ensures it wraps the entire tree and cannot be accidentally omitted |
| Inter loaded via Google Fonts (weights 400, 500) | Inter is not a system font on most platforms; without an explicit font load `--font-sans` would silently fall back to `system-ui`, producing inconsistent typography |
| `bestScore` derived only from in-zone agents | An agent with e.g. social=95, planetary=10 would dominate `Math.max` but is not in the habitable zone; only agents where both social >= 60 AND planetary >= 60 are eligible |
| `deepCopy(g.scores)` into local state in `useGame` | Prevents score drift from mutating the shared `MOCK_GAMES` constant, which would corrupt subsequent `fetchGame` calls |
| SVG for ring/plot, not Canvas | Easier to animate with CSS, accessible, scales to any DPI |
| CSS Modules over Tailwind | Matches "scientific field notebook" aesthetic, avoids class noise in JSX |
| Polling via setInterval, not WebSocket | Prototype scope; clean swap-in surface |
| React Router v6 (no loader API) | useEffect fetching is simpler for mock data |
| No animation library | Pulse is one keyframe; a library would add 40KB for nothing |
| 13 personas in one file | They are fixed domain data, not user-generated |

---

*Plan written 2026-03-23. Revised 2026-03-23 (pass 1) to address: explicit --save for react-router-dom, full CSS reset for Vite scaffold teardown, Cartesian axis approach for HabitableZoneRing (replacing incorrect concentric ring coordinate math), clearInterval cleanup in useLiveStats and useGame, deepCopy local score state in useGame to avoid mutating MOCK_GAMES, and Google Fonts link step in implementation order. Revised 2026-03-23 (pass 2) to address: (1) stale async fetch in useGame — added `let cancelled = false` flag guarding all setState calls and returned `() => { cancelled = true; clearInterval(id_interval) }` from effect; (2) explicit field schemas for MOCK_GAMES, MOCK_RECENT, and MOCK_LEADERBOARD replacing empty stubs; (3) bestScore now ignores out-of-zone agents — only agents where social >= 60 AND planetary >= 60 are included, result is null when no agent is in-zone; (4) Google Fonts insertion anchor corrected to before `</head>` (Vite has no `<link rel="stylesheet">` for index.css in index.html); (5) App.jsx wipe instruction changed to full replacement with complete file content to avoid Vite module-not-found errors from scaffold asset imports. Revised 2026-03-23 (pass 3) to address: (1) main.jsx never got BrowserRouter — added full main.jsx replacement content to §5 and §13 step 4 with StrictMode+BrowserRouter wrapping App; (2) removed dead computeSocialScore/computePlanetaryScore from §4 — prototype uses pre-computed mock scores perturbed directly, no metrics layer needed; (3) HabitableZoneRing pulse animation now uses isPulsing state boolean + onAnimationEnd (removed imperative classList approach that had no useRef); (4) Inter added to Google Fonts link (single combined stylesheet URL) — Inter is not a system font and must be loaded explicitly; (5) cancelled flag comment corrected — it guards only stale fetchGame promises, not interval ticks (clearInterval makes that check dead code). Revised 2026-03-23 (pass 4) to address: (1) MOCK_GAMES, MOCK_RECENT, and MOCK_LEADERBOARD replaced with complete concrete entries (4–6 games, 5 recent results, 10 leaderboard rows) using all required schema fields and realistic varied data; (2) HabitableZoneRing §9e pulse animation now fires only on improvements — added prevBestRef = useRef(null) and guards setIsPulsing(true) behind `bestScore > prevBestRef.current`, ref updated after check; (3) §9f dynamic opacity scaling removed entirely — fill fixed at rgba(76,175,110,0.20) to avoid conflict with ring-pulse keyframe which also controls opacity; (4) §3c createGame fully specified — maps persona id strings to agent descriptors with nanoid ids, initialises scores, stores in module-level LIVE_GAMES Map, fetchGame checks LIVE_GAMES before MOCK_GAMES; nanoid added to §0 install command and §13 step 1; (5) useLiveStats §12a now has cancelled flag guarding initial fetchLiveStats().then() with `if (!cancelled) setStats(data)`, cleanup returns `() => { cancelled = true; clearInterval(id) }`; (6) false claim about non-existent assets causing module-not-found errors removed from §5, §13 step 2, and §16 key decisions table — justification now accurately states the scaffold App.jsx renders the incompatible Vite welcome page. Covers all spec sections 01–07 within prototype scope.*
