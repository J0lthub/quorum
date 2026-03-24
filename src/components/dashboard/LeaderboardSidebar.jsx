import { useState, useEffect } from 'react'
import { fetchLeaderboard, PERSONAS } from '../../api/client.js'
import styles from './LeaderboardSidebar.module.css'

function getPersonaColor(personaId) {
  const p = PERSONAS.find(p => p.id === personaId)
  return p ? p.color : '#6b7068'
}

export default function LeaderboardSidebar() {
  const [leaderboard, setLeaderboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchLeaderboard().then(data => {
      if (!cancelled) {
        setLeaderboard(data)
        setIsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) { setError('Failed to load leaderboard.'); setIsLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.title}>Leaderboard</h2>
      {error && <span className={styles.error}>{error}</span>}
      {isLoading
        ? <span>Loading…</span>
        : !leaderboard ? null
        : (
          <ol className={styles.list}>
            {leaderboard.map(entry => (
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
                <span className={styles.score}>{entry.bestScore != null ? Number(entry.bestScore).toFixed(1) : '—'}</span>
              </li>
            ))}
          </ol>
        )
      }
    </aside>
  )
}
