import { useState, useEffect } from 'react'
import { fetchHistory } from '../../api/client.js'
import ScoreChart from './ScoreChart'
import styles from './AgentHistoryPanel.module.css'

function delta(curr, prev, key) {
  if (prev == null) return null
  return curr[key] - prev[key]
}

function DeltaBadge({ value }) {
  if (value == null) return null
  const pos = value >= 0
  return (
    <span className={`${styles.delta} ${pos ? styles.pos : styles.neg}`}>
      {pos ? '+' : ''}{value.toFixed(1)}
    </span>
  )
}

export default function AgentHistoryPanel({ gameId, agent, onClose }) {
  const [history, setHistory]   = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    setHistory(null)
    setSelected(null)
    fetchHistory(gameId).then(data => {
      const agentHistory = data[agent.id] ?? []
      setHistory(agentHistory)
      // Default: select the latest iteration that has a decision
      const withDecision = [...agentHistory].reverse().find(h => h.decision)
      setSelected(withDecision ?? agentHistory[agentHistory.length - 1] ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [gameId, agent.id])

  const iterationsWithDecisions = history?.filter(h => h.decision) ?? []

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.dot} style={{ background: agent.color }} />
        <span className={styles.title}>{agent.name}</span>
        <span className={styles.subtitle}>{iterationsWithDecisions.length} decisions</span>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      {loading && <p className={styles.empty}>Loading history…</p>}

      {!loading && history && (
        <>
          <div className={styles.chartWrap}>
            <ScoreChart
              history={history}
              socialColor={agent.color}
              planetaryColor="#64b5f6"
              activeIteration={selected?.iteration}
              onSelectIteration={setSelected}
            />
          </div>

          {selected?.decision && (
            <div className={styles.callout}>
              <div className={styles.calloutHeader}>
                <span className={styles.iterBadge}>ITER {selected.iteration}</span>
                <span className={styles.calloutScores}>
                  Social <strong>{selected.social.toFixed(1)}</strong>
                  {' · '}
                  Planet <strong>{selected.planetary.toFixed(1)}</strong>
                </span>
              </div>
              <p className={styles.calloutDecision}>{selected.decision}</p>
              {selected.reasoning && (
                <p className={styles.calloutReasoning}>{selected.reasoning}</p>
              )}
            </div>
          )}

          <div className={styles.diffLog}>
            <div className={styles.diffLogTitle}>DECISION LOG</div>
            {[...iterationsWithDecisions].reverse().map((h, i, arr) => {
              const prev = arr[i + 1] ?? history.find(x => x.iteration === h.iteration - 1)
              const dSocial    = delta(h, prev, 'social')
              const dPlanetary = delta(h, prev, 'planetary')
              const isActive   = selected?.iteration === h.iteration

              return (
                <button
                  key={h.iteration}
                  className={`${styles.diffEntry} ${isActive ? styles.diffActive : ''}`}
                  onClick={() => setSelected(h)}
                >
                  <div className={styles.diffTop}>
                    <span className={styles.diffIter}>#{h.iteration}</span>
                    <span className={styles.diffDeltas}>
                      <span className={styles.diffDeltaLabel}>S</span>
                      <DeltaBadge value={dSocial} />
                      <span className={styles.diffDeltaLabel}>P</span>
                      <DeltaBadge value={dPlanetary} />
                    </span>
                    <span className={`${styles.diffZone} ${h.inZone ? styles.inZone : ''}`}>
                      {h.inZone ? '✓ zone' : '✗'}
                    </span>
                  </div>
                  <p className={styles.diffDecision}>{h.decision}</p>
                </button>
              )
            })}

            {iterationsWithDecisions.length === 0 && (
              <p className={styles.empty}>No decisions yet — game in progress</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
