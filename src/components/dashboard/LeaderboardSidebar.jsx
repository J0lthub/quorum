import { MOCK_LEADERBOARD, PERSONAS } from '../../api/mock'
import styles from './LeaderboardSidebar.module.css'

function getPersonaColor(personaId) {
  const p = PERSONAS.find(p => p.id === personaId)
  return p ? p.color : '#6b7068'
}

export default function LeaderboardSidebar() {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Leaderboard</h2>
      <ol className={styles.list}>
        {MOCK_LEADERBOARD.map(entry => (
          <li
            key={entry.rank}
            className={`${styles.row} ${entry.rank === 1 ? styles.rankOne : ''}`}
          >
            <span className={styles.rank}>{entry.rank}</span>
            <span
              className={styles.colorDot}
              style={{ background: getPersonaColor(entry.winningPersona) }}
            />
            <span className={styles.username}>{entry.username}</span>
            <span className={styles.score}>{entry.bestScore.toFixed(1)}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}
