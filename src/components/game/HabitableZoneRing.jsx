import { useState, useEffect, useRef } from 'react'
import styles from './HabitableZoneRing.module.css'

const TICKS = [0, 20, 40, 60, 80, 100]

function toX(social)    { return 50 + (social / 100) * 400 }
function toY(planetary) { return 450 - (planetary / 100) * 400 }

export default function HabitableZoneRing({ agents, agentScores, bestScore }) {
  const [isPulsing, setIsPulsing] = useState(false)
  const prevBestRef = useRef(null)

  useEffect(() => {
    if (bestScore == null) {
      prevBestRef.current = null
      return
    }
    if (prevBestRef.current === null || bestScore > prevBestRef.current) {
      setIsPulsing(true)
    }
    prevBestRef.current = bestScore
  }, [bestScore])

  return (
    <svg
      viewBox="0 0 500 500"
      className={styles.svg}
      aria-label="Habitable Zone plot"
    >
      {/* Habitable zone fill */}
      <rect
        x="290" y="50"
        width="160" height="160"
        fill="rgba(76, 175, 110, 0.20)"
        className={`${styles.habitableZoneFill}${isPulsing ? ` ${styles.ringPulse}` : ''}`}
        onAnimationEnd={() => setIsPulsing(false)}
      />

      {/* IN ZONE label */}
      <text
        x="370" y="135"
        textAnchor="middle"
        className={styles.inZoneLabel}
      >
        IN ZONE
      </text>

      {/* Threshold lines */}
      <line x1="290" y1="50" x2="290" y2="450" className={styles.thresholdLine} />
      <line x1="50" y1="210" x2="450" y2="210" className={styles.thresholdLine} />

      {/* Axes */}
      <line x1="50" y1="450" x2="450" y2="450" className={styles.axisLine} />
      <line x1="50" y1="450" x2="50" y2="50" className={styles.axisLine} />

      {/* Axis labels */}
      <text x="450" y="468" textAnchor="end" className={styles.axisLabel}>Social Score →</text>
      <text x="30" y="45" textAnchor="middle" className={styles.axisLabel}>↑</text>
      <text x="30" y="55" textAnchor="middle" className={styles.axisLabel} style={{ fontSize: '8px' }}>Planetary</text>
      <text x="30" y="65" textAnchor="middle" className={styles.axisLabel} style={{ fontSize: '8px' }}>Score</text>

      {/* Tick marks + labels — X axis */}
      {TICKS.map(v => {
        const x = toX(v)
        return (
          <g key={`x-${v}`}>
            <line x1={x} y1="450" x2={x} y2="455" className={styles.axisLine} />
            <text x={x} y="465" textAnchor="middle" className={styles.tickLabel}>{v}</text>
          </g>
        )
      })}

      {/* Tick marks + labels — Y axis */}
      {TICKS.map(v => {
        const y = toY(v)
        return (
          <g key={`y-${v}`}>
            <line x1="45" y1={y} x2="50" y2={y} className={styles.axisLine} />
            <text x="40" y={y + 3} textAnchor="end" className={styles.tickLabel}>{v}</text>
          </g>
        )
      })}

      {/* Agent points */}
      {agents && agentScores && agents.map(agent => {
        const score = agentScores[agent.id]
        if (!score) return null
        const x = toX(score.social)
        const y = toY(score.planetary)
        return (
          <g key={agent.id}>
            <circle
              cx={x} cy={y} r="14"
              fill={agent.color || '#6b7068'}
              className={styles.agentHalo}
            />
            <circle
              cx={x} cy={y} r="8"
              fill={agent.color || '#6b7068'}
            >
              <title>{agent.name}: Social {score.social.toFixed(1)}, Planetary {score.planetary.toFixed(1)}</title>
            </circle>
          </g>
        )
      })}
    </svg>
  )
}
