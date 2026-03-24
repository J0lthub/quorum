import { useState, useEffect } from 'react'
import { fetchRecent, PERSONAS } from '../../api/mock'
import styles from './RecentResults.module.css'

function getPersona(id) {
  return PERSONAS.find(p => p.id === id)
}

export default function RecentResults() {
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchRecent().then(data => {
      if (!cancelled) {
        setResults(data)
        setIsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) { setError('Failed to load recent results.'); setIsLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Recent Results</h2>
      {error && <span>{error}</span>}
      <div className={styles.strip}>
        {isLoading
          ? <span>Loading…</span>
          : !results ? null
          : results.map(result => {
              const persona = getPersona(result.winningPersona)
              return (
                <div key={result.id} className={styles.item}>
                  <div className={styles.question}>
                    {result.question.length > 40
                      ? result.question.slice(0, 40) + '…'
                      : result.question}
                  </div>
                  <div className={styles.meta}>
                    {persona && (
                      <span
                        className={styles.personaChip}
                        style={{
                          background: persona.color + '33',
                          color: persona.color,
                        }}
                      >
                        {persona.name}
                      </span>
                    )}
                    <span className={styles.score}>{result.habitableScore.toFixed(1)}</span>
                    <a href={result.diffUrl} className={styles.diffLink}>diff</a>
                    <span className={styles.hash}>{result.commitHash}</span>
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}
