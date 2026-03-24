import { nanoid } from 'nanoid'

const branchCounters = new Map()

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
      { id: 'a-014', personaId: 'equity_analyst',  branch: 'agent/equity_analyst-02',  iteration: 0 },
      { id: 'a-015', personaId: 'engineer',         branch: 'agent/engineer-02',         iteration: 0 },
      { id: 'a-016', personaId: 'commons_steward',  branch: 'agent/commons_steward-02',  iteration: 0 },
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

// Module-level mutable store for in-progress games
const LIVE_GAMES = new Map()

export async function fetchGames() {
  return new Promise(resolve => setTimeout(() => resolve([...LIVE_GAMES.values(), ...MOCK_GAMES]), 120))
}

export async function fetchRecent() {
  return new Promise(resolve => setTimeout(() => resolve(MOCK_RECENT), 120))
}

export async function fetchGame(id) {
  return new Promise(resolve => setTimeout(() => {
    if (LIVE_GAMES.has(id)) {
      resolve(LIVE_GAMES.get(id))
    } else {
      resolve(MOCK_GAMES.find(g => g.id === id) ?? null)
    }
  }, 120))
}

export async function fetchLeaderboard() {
  return new Promise(resolve => setTimeout(() => resolve(MOCK_LEADERBOARD), 120))
}

export async function fetchLiveStats() {
  return new Promise(resolve => setTimeout(() => {
    resolve({
      activeAgents:  MOCK_LIVE_STATS.activeAgents  + Math.floor(Math.random() * 5 - 2),
      totalCommits:  MOCK_LIVE_STATS.totalCommits  + Math.floor(Math.random() * 10),
      datasets:      MOCK_LIVE_STATS.datasets      + Math.floor(Math.random() * 3 - 1),
    })
  }, 120))
}

export async function createGame({ question, agents: personaIds }) {
  return new Promise(resolve => setTimeout(() => {
    const gameId = nanoid()
    const agentDescriptors = personaIds.map(personaId => {
      const count = (branchCounters.get(personaId) ?? 0) + 1
      branchCounters.set(personaId, count)
      return {
        id:        nanoid(),
        personaId,
        branch:    `agent/${personaId}-${String(count).padStart(2, '0')}`,
        iteration: 0,
      }
    })
    const scores = {}
    for (const agent of agentDescriptors) {
      scores[agent.id] = {
        social:    55 + Math.random() * 25,
        planetary: 55 + Math.random() * 25,
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
