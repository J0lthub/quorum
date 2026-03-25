import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useLiveStats } from '../hooks/useLiveStats'
import WanderingLines from '../components/layout/WanderingLines'
import QuestionInput from '../components/dashboard/QuestionInput'
import ActiveGamesGrid from '../components/dashboard/ActiveGamesGrid'
import RecentResults from '../components/dashboard/RecentResults'
import LeaderboardSidebar from '../components/dashboard/LeaderboardSidebar'
import PersonaModal from '../components/persona/PersonaModal'
import styles from './Dashboard.module.css'

// Dot-matrix "Q" — 5-col × 6-row grid, each dot = circle r=7 at 20px spacing
const Q_DOTS = [
  [1,0],[2,0],[3,0],
  [0,1],[4,1],
  [0,2],[4,2],
  [0,3],[3,3],[4,3],
  [1,4],[2,4],[3,4],
              [3,5],
]

export default function Dashboard() {
  const [pendingQuestion, setPendingQuestion] = useState(null)
  const stats = useLiveStats()

  return (
    <div className={styles.layout}>
      <WanderingLines />

      {/* ── Left panel (sage) ──────────────────────────── */}
      <aside className={styles.panelLeft}>
        <div className={styles.headerMeta}>
          <span>Quorum v1.0</span>
          <span>Sys. Status: Active</span>
        </div>

        <nav className={styles.sideNav}>
          <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/personas" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>
            The Council
          </NavLink>
          <NavLink to="/model" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>
            The Model
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>
            Why
          </NavLink>
        </nav>

        <div className={styles.heroType}>
          <svg viewBox="0 0 100 130" className={styles.dotQ} aria-label="Q">
            {Q_DOTS.map(([col, row]) => (
              <circle key={`${col}-${row}`} cx={10 + col * 20} cy={10 + row * 20} r="7" fill="var(--earth)" />
            ))}
          </svg>
          <div className={styles.brand}>QUORUM</div>
          <div className={styles.brandSub}>Multi-Agent Deliberation</div>
        </div>
      </aside>

      {/* ── Right panel (earth) ────────────────────────── */}
      <main className={styles.panelRight}>
        <header className={styles.dashHeader}>
          <h1 className={styles.dashTitle}>
            Deliberation<br />Platform
          </h1>
          <div className={styles.dashStats}>
            <div className={styles.statBlock}>
              <span className={styles.statLabel}>Active Agents</span>
              <span className={styles.statValue}>{stats ? stats.activeAgents.toLocaleString() : '—'}</span>
            </div>
            <div className={styles.statBlock}>
              <span className={styles.statLabel}>Iterations</span>
              <span className={styles.statValue}>{stats ? stats.totalIterations.toLocaleString() : '—'}</span>
            </div>
            <div className={styles.statBlock}>
              <span className={styles.statLabel}>Datasets</span>
              <span className={styles.statValue}>{stats ? stats.datasets : '—'}</span>
            </div>
          </div>
        </header>

        <div className={styles.vizContainer}>
          <div className={styles.mainCol}>
            <QuestionInput onSubmit={q => setPendingQuestion(q)} />
            <div className={styles.gamesSection}>
              <ActiveGamesGrid />
            </div>
            <div className={styles.recentSection}>
              <RecentResults />
            </div>
          </div>
          <aside className={styles.sideCol}>
            <LeaderboardSidebar />
          </aside>
        </div>
      </main>

      {pendingQuestion && (
        <PersonaModal
          question={pendingQuestion}
          onClose={() => setPendingQuestion(null)}
        />
      )}
    </div>
  )
}
