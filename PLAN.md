# The Donut Game — Implementation Plan

Branch: `build-dashboard-persona-habitable-zone`
Stack: React 19 + Vite 8, React Router v6, plain CSS modules (no external UI lib)
Scope: Dashboard `/`, Persona Selection modal, Habitable Zone ring on `/game/:id`

---

## 0. Dependency install (first step before any code)

```
npm install --save react-router-dom
```

The `--save` flag (default in npm 5+ but stated explicitly for clarity) ensures
`react-router-dom` is written to `dependencies` in `package.json`. Verify after
install: `package.json` must list it so a fresh `npm install` on a clean checkout
resolves the package without manual intervention.

No other runtime dependencies. All visuals are SVG/CSS. All data is mocked.

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
  --ring-fill:         rgba(76, 175, 110, 0.12);
}
```

### 2a. Google Fonts — add to `index.html`

Add the following `<link>` tags inside `<head>` of `index.html` **before** the
`<link rel="stylesheet" href="/src/index.css" />` entry so the font is available
when the CSS custom property `--font-mono` is first used:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

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

```js
export const MOCK_GAMES = [/* 4–6 active game objects */]
export const MOCK_RECENT = [/* 5 completed game summaries */]
export const MOCK_LEADERBOARD = [/* 10 user entries */]
export const MOCK_LIVE_STATS = { activeAgents: 47, totalCommits: 12843, datasets: 31 }
```

Each game object:
```js
{
  id: 'g-001',
  question: 'What is the best way to reduce carbon emissions in NYC?',
  status: 'active',           // 'active' | 'complete'
  agents: ['scientist','engineer','planetary_bounds'],
  scores: {
    scientist:        { social: 72, planetary: 81 },
    engineer:         { social: 68, planetary: 74 },
    planetary_bounds: { social: 61, planetary: 92 },
  },
  bestScore: 76.5,
  startedAt: '2026-03-23T10:14:00Z',
}
```

### 3c. Async helpers (simulated network)

```js
export async function fetchGames()       // resolves MOCK_GAMES after 120ms
export async function fetchGame(id)      // resolves single game
export async function fetchLeaderboard() // resolves MOCK_LEADERBOARD
export async function fetchLiveStats()   // resolves MOCK_LIVE_STATS + small random delta
export async function createGame(payload) // resolves new game object with generated id
```

---

## 4. Scoring Engine (inside `src/hooks/useGame.js`)

Pure functions, no side effects. Export separately so tests can import them.

```js
// Returns 0–100
export function computeSocialScore(metrics) { /* weighted average of floor metrics */ }
export function computePlanetaryScore(metrics) { /* weighted average of ceiling metrics */ }
export function computeHabitableScore(social, planetary) {
  if (social < 60 || planetary < 60) return null // outside zone
  return (social + planetary) / 2
}
export function isInZone(social, planetary) { return social >= 60 && planetary >= 60 }
```

The hook wires these to mock agent data and returns reactive state.

---

## 5. Routing (`src/main.jsx` + `src/App.jsx`)

```jsx
// main.jsx
import { BrowserRouter } from 'react-router-dom'
// wrap <App /> in <BrowserRouter>

// App.jsx
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

```svg
<!-- Habitable zone: social 60–100, planetary 60–100 -->
<!-- x from 290 to 450, y from 50 to 210 (SVG coordinates) -->
<rect
  x="290" y="50"
  width="160" height="160"
  fill="rgba(76, 175, 110, 0.12)"
  class="habitableZoneFill"
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

### 9e. Pulse animation on new best

When `bestScore` changes (useEffect watching it), add CSS class `.ring-pulse` to the
habitable zone fill rectangle. The class runs a 1.2s keyframe:
```css
@keyframes ring-pulse {
  0%   { opacity: 0.12; }
  40%  { opacity: 0.40; }
  100% { opacity: 0.12; }
}
```

Remove the class after animation ends via `animationend` event listener.

### 9f. Zone expansion representation

The habitable zone fill opacity scales with best score. At score 60 (minimum)
opacity is 0.10; at score 100 opacity is 0.35. Continuous CSS variable update,
not an animation.

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
    fetchLiveStats().then(setStats)

    const id = setInterval(() => {
      fetchLiveStats().then(setStats)
    }, 5000)

    return () => clearInterval(id)   // REQUIRED: prevents double-interval in StrictMode
  }, [])

  return stats
}
```

The `return () => clearInterval(id)` cleanup is mandatory. React StrictMode
double-mounts components in development; without the cleanup, two intervals run
concurrently, doubling the update rate and causing stale-closure bugs.

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
    fetchGame(id).then(g => {
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

    return () => clearInterval(id_interval)  // REQUIRED: same StrictMode reason as above
  }, [id])

  // Derive bestScore from local agentScores, not from game.scores
  const bestScore = agentScores
    ? Math.max(...Object.values(agentScores).map(s => (s.social + s.planetary) / 2))
    : null

  return { game, agentScores, bestScore, isLoading }
}
```

Key invariants enforced here:
1. `agentScores` is initialized from `deepCopy(g.scores)` — the shared `MOCK_GAMES`
   constant is never touched after the initial fetch.
2. The interval updater uses the functional form of `setAgentScores` to avoid
   stale closures.
3. `clearInterval` is returned from the effect to prevent duplicate intervals.

---

## 13. Implementation Order (sequential, each is a shippable increment)

1. **Install deps** — `npm install --save react-router-dom`; verify `package.json`
   lists it under `dependencies`
2. **Wipe scaffold** — delete `src/App.css`; replace `src/index.css` wholesale with
   the full reset + token CSS from §2; delete boilerplate from `App.jsx`
3. **Add Google Fonts to `index.html`** — insert the three JetBrains Mono `<link>`
   tags into `<head>` (§2a) so `--font-mono` resolves on first paint
4. **Routing skeleton** — `main.jsx` with `BrowserRouter`, `App.jsx` with two routes,
   stub `Dashboard` and `GameView` pages that render `<h1>` placeholders
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
| Google Fonts `<link>` in `index.html` | `--font-mono` must resolve on first paint; CSS custom properties can't load fonts |
| Cartesian X/Y axes for Habitable Zone (not concentric rings) | Concentric ring geometry does not map correctly to the social/planetary score thresholds; a point at exactly score=60 on both axes would fall far inside the inner ring (r=110) rather than on its boundary |
| `clearInterval` in every `useEffect` that calls `setInterval` | React StrictMode double-mounts in dev; without cleanup two intervals run, doubling update rate |
| `deepCopy(g.scores)` into local state in `useGame` | Prevents score drift from mutating the shared `MOCK_GAMES` constant, which would corrupt subsequent `fetchGame` calls |
| SVG for ring/plot, not Canvas | Easier to animate with CSS, accessible, scales to any DPI |
| CSS Modules over Tailwind | Matches "scientific field notebook" aesthetic, avoids class noise in JSX |
| Polling via setInterval, not WebSocket | Prototype scope; clean swap-in surface |
| React Router v6 (no loader API) | useEffect fetching is simpler for mock data |
| No animation library | Pulse is one keyframe; a library would add 40KB for nothing |
| 13 personas in one file | They are fixed domain data, not user-generated |

---

*Plan written 2026-03-23. Revised 2026-03-23 to address: explicit --save for react-router-dom, full CSS reset for Vite scaffold teardown, Cartesian axis approach for HabitableZoneRing (replacing incorrect concentric ring coordinate math), clearInterval cleanup in useLiveStats and useGame, deepCopy local score state in useGame to avoid mutating MOCK_GAMES, and Google Fonts link step in implementation order. Covers all spec sections 01–07 within prototype scope.*
