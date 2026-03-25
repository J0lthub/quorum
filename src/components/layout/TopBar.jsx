import { NavLink } from 'react-router-dom'
import { useLiveStats } from '../../hooks/useLiveStats'
import styles from './TopBar.module.css'

export default function TopBar() {
  const stats = useLiveStats()

  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <NavLink to="/" className={styles.logo}>QUORUM</NavLink>
        <nav className={styles.nav}>
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
      </div>
      <div className={styles.right}>
        <span className={styles.chip}>
          <span className={styles.dot} />
          {stats ? `${stats.activeAgents.toLocaleString()} agents` : '—'}
        </span>
        <span className={styles.chip}>
          {stats ? `${stats.totalIterations.toLocaleString()} iterations` : '—'}
        </span>
      </div>
    </header>
  )
}
