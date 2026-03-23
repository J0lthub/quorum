# The Donut Game — Implementation Plan

Branch: `build-dashboard-persona-habitable-zone`
Stack: React 19 + Vite 8, React Router v6, plain CSS modules (no external UI lib)
Scope: Dashboard `/`, Persona Selection modal, Habitable Zone ring on `/game/:id`

---

## 0. Dependency install (first step before any code)

```
npm install react-router-dom
```

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
      HabitableZoneRing.jsx       # SVG concentric ring + agent points + axes
      AgentPointLegend.jsx        # colored legend for active agents
      ScorePanel.jsx              # numeric score breakdown per agent
```

---

## 2. Design Tokens (`src/index.css`)

All color, spacing, and typography in CSS custom properties on `:root`. No values
hard-coded inside component files.

```css
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

Load JetBrains Mono via a `<link>` in `index.html` from Google Fonts.

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

### 9a. Coordinate system

`viewBox="0 0 500 500"`, center at (250, 250).

Two concentric rings:
- Outer ring: radius 200px — planetary ceiling boundary (amber stroke, dashed)
- Inner ring: radius 110px — social floor boundary (green stroke, dashed)
- Filled annular zone between them: `<path>` or `<circle>` clip trick

SVG annulus (the habitable zone fill):
```svg
<!-- outer circle clip path then fill -->
<defs>
  <mask id="annulus-mask">
    <circle cx="250" cy="250" r="200" fill="white"/>
    <circle cx="250" cy="250" r="110" fill="black"/>
  </mask>
</defs>
<circle cx="250" cy="250" r="200" fill="var(--ring-fill)" mask="url(#annulus-mask)"/>
```

### 9b. Axes

Two faint lines through center at 45° rotation — actually the spec calls for X (social)
and Y (planetary) axes. Draw them as SVG `<line>` elements:

- Horizontal axis: (50, 250)→(450, 250), label "Social Score →" at right end
- Vertical axis: (250, 450)→(250, 50), label "↑ Planetary Score" at top
- Quadrant labels (faint, monospace): "IN ZONE" top-right, axis tick marks at 0/50/100

### 9c. Agent points

Each agent is a colored `<circle r="8">` plotted at:
```
x = 50 + (socialScore / 100) * 400
y = 450 - (planetaryScore / 100) * 400
```

Point has a `<title>` for hover tooltip (native SVG). A larger translucent halo circle
`r="14"` behind it at 40% opacity.

### 9d. Pulse animation on new best

When `bestScore` changes (useEffect watching it), add CSS class `.ring-pulse` to the
annulus fill element. The class runs a 1.2s keyframe:
```css
@keyframes ring-pulse {
  0%   { opacity: 0.12; }
  40%  { opacity: 0.40; }
  100% { opacity: 0.12; }
}
```

Remove the class after animation ends via `animationend` event listener. This is the
only animation in the file — keep it targeted.

### 9e. Zone expansion representation

Rather than literally resizing the rings (the spec says "bigger ring = better outcome"),
implement it as: the habitable zone fill opacity scales with best score. At score 60
(minimum) opacity is 0.10; at score 100 opacity is 0.35. This is a continuous CSS
variable update, not an animation.

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
- Sets up `setInterval(2000)` that mutates agent scores by ±2 per tick (simulating
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

## 12. Implementation Order (sequential, each is a shippable increment)

1. **Install deps + wipe scaffold** — `npm install react-router-dom`, delete boilerplate
   from `App.jsx`, `App.css`, `index.css`; replace with design token CSS
2. **Routing skeleton** — `main.jsx` with `BrowserRouter`, `App.jsx` with two routes,
   stub `Dashboard` and `GameView` pages that render `<h1>` placeholders
3. **Mock API layer** — `src/api/mock.js` with all data + async helpers
4. **TopBar** — fixed header with live stats via `useLiveStats` hook
5. **Dashboard layout** — CSS grid shell with three named areas, no content yet
6. **QuestionInput** — auto-grow textarea, submit handler opens modal (modal stub)
7. **ActiveGamesGrid + GameCard** — fetch mock games, render grid
8. **RecentResults** — horizontal strip from mock data
9. **LeaderboardSidebar** — ordered list from mock data
10. **PersonaCard** — single card component, selection state
11. **PersonaModal** — full modal with all 13 personas, 2–5 constraint, team preview,
    "Start Game" integration
12. **HabitableZoneRing** — SVG component, static first (hardcoded test scores)
13. **useGame hook + GameView wiring** — live score simulation, ring reacts to state
14. **ScorePanel + AgentPointLegend** — complete the game view
15. **Pulse animation** — add `ring-pulse` keyframe and trigger logic
16. **Polish pass** — monospace font, hover states, loading shimmer, responsive CSS

---

## 13. CSS Approach

- One global `index.css` for tokens, reset, and typography
- Each component imports a co-located `.module.css` file (CSS Modules)
- No Tailwind, no styled-components — keeps the build light and reviewable
- Grid and flexbox only (no float, no absolute except overlays)
- All color references go through custom properties, never hardcoded hex inside modules

---

## 14. What is NOT in scope (prototype deferral)

- `/leaderboard` and `/datasets` routes — nav links present but routes 404
- Real Dolt API integration (all endpoints mocked)
- Auth / user accounts
- Actual diff viewer
- Accessibility audit (ARIA roles added but not exhaustively tested)
- Mobile breakpoints below 768px

---

## 15. Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| SVG for ring, not Canvas | Easier to animate with CSS, accessible, scales to any DPI |
| CSS Modules over Tailwind | Matches "scientific field notebook" aesthetic, avoids class noise in JSX |
| Polling via setInterval, not WebSocket | Prototype scope; clean swap-in surface |
| React Router v6 (no loader API) | useEffect fetching is simpler for mock data |
| No animation library | Pulse is one keyframe; a library would add 40KB for nothing |
| 13 personas in one file | They are fixed domain data, not user-generated |

---

*Plan written 2026-03-23. Covers all spec sections 01–07 within prototype scope.*
