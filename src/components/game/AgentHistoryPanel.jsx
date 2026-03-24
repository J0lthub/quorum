import { useState, useEffect } from 'react'
import { fetchHistory } from '../../api/client.js'
import ScoreChart from './ScoreChart'
import styles from './AgentHistoryPanel.module.css'

function DeltaBadge({ value }) {
  if (value == null) return null
  const pos = value >= 0
  return (
    <span className={`${styles.delta} ${pos ? styles.pos : styles.neg}`}>
      {pos ? '+' : ''}{value.toFixed(1)}
    </span>
  )
}

export default function AgentHistoryPanel({ gameId, agents, onClose }) {
  const [allHistory, setAllHistory] = useState({})   // agentId → history[]
  const [loading, setLoading]       = useState(true)
  const [activePoint, setActivePoint] = useState(null) // { agentId, iteration, decision, ... }
  const [logAgentId, setLogAgentId]   = useState(agents[0]?.id)

  useEffect(() => {
    setLoading(true)
    fetchHistory(gameId).then(data => {
      setAllHistory(data)
      // Default callout: latest decision of first agent
      const first = agents[0]
      if (first) {
        const h = (data[first.id] ?? []).filter(x => x.decision).at(-1)
        if (h) setActivePoint({ agentId: first.id, ...h })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [gameId, agents.map(a => a.id).join(',')])

  // When agents list changes, default log view to first agent
  useEffect(() => {
    setLogAgentId(agents[0]?.id)
  }, [agents.map(a => a.id).join(',')])

  const datasets = agents.map(agent => ({
    id:      agent.id,
    color:   agent.color,
    name:    agent.name,
    history: allHistory[agent.id] ?? [],
  })).filter(d => d.history.length > 0)

  const logAgent    = agents.find(a => a.id === logAgentId) ?? agents[0]
  const logHistory  = allHistory[logAgent?.id] ?? []
  const withDecisions = logHistory.filter(h => h.decision)

  const calloutAgent = agents.find(a => a.id === activePoint?.agentId)

  return (
    <div className={styles.panel}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerDots}>
          {agents.map(a => (
            <span key={a.id} className={styles.dot} style={{ background: a.color }} title={a.name} />
          ))}
        </div>
        <span className={styles.title}>
          {agents.length === 1 ? agents[0].name : `${agents.length} personas compared`}
        </span>
        <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      {loading && <p className={styles.empty}>Loading…</p>}

      {!loading && (
        <div className={styles.body}>

          {/* Chart + callout side by side */}
          <div className={styles.chartRow}>
            <div className={styles.chartWrap}>
              <ScoreChart
                datasets={datasets}
                activePoint={activePoint}
                onSelectPoint={setActivePoint}
              />
            </div>

            {/* Callout for selected point */}
            {activePoint?.decision ? (
              <div className={styles.callout}>
                {calloutAgent && (
                  <div className={styles.calloutMeta}>
                    <span className={styles.calloutDot} style={{ background: calloutAgent.color }} />
                    <span className={styles.calloutName}>{calloutAgent.name}</span>
                    <span className={styles.iterBadge}>#{activePoint.iteration}</span>
                  </div>
                )}
                <div className={styles.calloutScores}>
                  <span>S <strong>{activePoint.social?.toFixed(1)}</strong></span>
                  <span>P <strong>{activePoint.planetary?.toFixed(1)}</strong></span>
                  <span>H <strong>{activePoint.habitable?.toFixed(1)}</strong></span>
                </div>
                <p className={styles.calloutDecision}>{activePoint.decision}</p>
                {activePoint.reasoning && (
                  <p className={styles.calloutReasoning}>{activePoint.reasoning}</p>
                )}
              </div>
            ) : (
              <div className={styles.callout}>
                <p className={styles.calloutHint}>Click any point on the chart to see that decision</p>
              </div>
            )}
          </div>

          {/* Agent tabs + decision log */}
          <div className={styles.logSection}>
            {agents.length > 1 && (
              <div className={styles.tabs}>
                {agents.map(a => (
                  <button
                    key={a.id}
                    className={`${styles.tab} ${logAgentId === a.id ? styles.tabActive : ''}`}
                    style={logAgentId === a.id ? { borderBottomColor: a.color } : {}}
                    onClick={() => setLogAgentId(a.id)}
                  >
                    <span className={styles.tabDot} style={{ background: a.color }} />
                    {a.name}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.diffLog}>
              {[...withDecisions].reverse().map((h, i, arr) => {
                const prev      = logHistory.find(x => x.iteration === h.iteration - 1)
                const dSocial   = prev != null ? h.social    - prev.social    : null
                const dPlanet   = prev != null ? h.planetary - prev.planetary : null
                const isActive  = activePoint?.agentId === logAgent?.id && activePoint?.iteration === h.iteration

                return (
                  <button
                    key={h.iteration}
                    className={`${styles.diffEntry} ${isActive ? styles.diffActive : ''}`}
                    style={isActive ? { borderLeftColor: logAgent?.color } : {}}
                    onClick={() => setActivePoint({ agentId: logAgent?.id, ...h })}
                  >
                    <div className={styles.diffTop}>
                      <span className={styles.diffIter}>#{h.iteration}</span>
                      <span className={styles.diffDeltas}>
                        <span className={styles.diffDeltaLabel}>S</span><DeltaBadge value={dSocial} />
                        <span className={styles.diffDeltaLabel}>P</span><DeltaBadge value={dPlanet} />
                      </span>
                      <span className={`${styles.diffZone} ${h.inZone ? styles.inZone : ''}`}>
                        {h.inZone ? '✓' : '✗'}
                      </span>
                    </div>
                    <p className={styles.diffDecision}>{h.decision}</p>
                  </button>
                )
              })}
              {withDecisions.length === 0 && (
                <p className={styles.empty}>No decisions yet</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
