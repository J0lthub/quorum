import { useLiveStats } from '../../hooks/useLiveStats'
import styles from './TopBar.module.css'

export default function TopBar() {
  const stats = useLiveStats()

  return (
    <header className={styles.topBar}>
      <span className={styles.logo}>Quorum</span>
      <div className={styles.chips}>
        <span className={`${styles.chip} ${stats ? styles.loaded : ''}`}>
          <span className={styles.dot} />
          {stats ? stats.activeAgents.toLocaleString() : '—'} agents
        </span>
        <span className={`${styles.chip} ${stats ? styles.loaded : ''}`}>
          {stats ? stats.totalIterations.toLocaleString() : '—'} iterations
        </span>
        <span className={`${styles.chip} ${stats ? styles.loaded : ''}`}>
          {stats ? stats.datasets : '—'} datasets
        </span>
      </div>
    </header>
  )
}
