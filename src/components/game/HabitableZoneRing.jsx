import { useState, useEffect, useRef } from 'react'
import styles from './HabitableZoneRing.module.css'

// ─── Geometry constants ────────────────────────────────────────────────────
const CX = 200
const CY = 200
const R_SOCIAL   = 82   // inner edge of habitable zone (social foundation floor, score=60)
const R_MID      = 126  // midline of habitable zone (optimal, score=70)
const R_PLANET   = 170  // outer edge of habitable zone (planetary ceiling, score=80)
const R_BACKDROP = 192  // full background radius

// Map a habitable score (0–100) to a visual radius
function scoreToR(score) {
  if (score <= 0)  return 0
  if (score <= 60) return (score / 60) * R_SOCIAL
  if (score <= 80) return R_SOCIAL + ((score - 60) / 20) * (R_PLANET - R_SOCIAL)
  return R_PLANET + ((score - 80) / 20) * (R_BACKDROP - R_PLANET)
}

// Polar → cartesian from center
function polar(r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

// SVG arc path for a dashed ring (used for boundary lines)
function ringArcPath(r) {
  return `M ${CX} ${CY - r} A ${r} ${r} 0 1 1 ${CX - 0.001} ${CY - r}`
}

// ─── Label positions on the ring (placed at the 10-o'clock angle) ─────────
const LABEL_ANGLE = -145

export default function HabitableZoneRing({ agents, agentScores, bestScore }) {
  const [isPulsing, setIsPulsing] = useState(false)
  const prevBestRef = useRef(null)

  useEffect(() => {
    if (bestScore == null) { prevBestRef.current = null; return }
    if (prevBestRef.current == null || bestScore > prevBestRef.current) setIsPulsing(true)
    prevBestRef.current = bestScore
  }, [bestScore])

  // Evenly space agents around the ring
  const agentCount = agents?.length ?? 0
  const agentAngles = agents?.map((_, i) =>
    (360 / Math.max(agentCount, 1)) * i + 20  // +20° offset so nobody starts at top
  ) ?? []

  return (
    <svg viewBox="0 0 400 400" className={styles.svg} role="img" aria-label="Doughnut economics habitable zone">

      {/* ── Background zones ────────────────────────────────────────────── */}

      {/* Planetary overshoot zone (full circle, darkish) */}
      <circle cx={CX} cy={CY} r={R_BACKDROP} className={styles.outerZone} />

      {/* Habitable ring fill */}
      <circle
        cx={CX} cy={CY} r={(R_SOCIAL + R_PLANET) / 2}
        strokeWidth={R_PLANET - R_SOCIAL}
        className={`${styles.habitableRing} ${isPulsing ? styles.ringPulse : ''}`}
        fill="none"
        onAnimationEnd={() => setIsPulsing(false)}
      />

      {/* Social deprivation zone (inner circle overlaid) */}
      <circle cx={CX} cy={CY} r={R_SOCIAL} className={styles.innerZone} />

      {/* ── Boundary circles ────────────────────────────────────────────── */}

      {/* Social foundation floor */}
      <circle cx={CX} cy={CY} r={R_SOCIAL} className={styles.socialBoundary} fill="none" />

      {/* Optimal midline */}
      <circle
        cx={CX} cy={CY} r={R_MID}
        className={styles.midline} fill="none"
        strokeDasharray="6 4"
      />

      {/* Planetary ceiling */}
      <circle cx={CX} cy={CY} r={R_PLANET} className={styles.planetBoundary} fill="none" />

      {/* ── Ring labels ─────────────────────────────────────────────────── */}

      {/* Social foundation label */}
      {(() => {
        const p = polar(R_SOCIAL + 6, LABEL_ANGLE)
        return (
          <text x={p.x} y={p.y} className={styles.boundaryLabel} textAnchor="middle">
            SOCIAL FLOOR
          </text>
        )
      })()}

      {/* Optimal midline label */}
      {(() => {
        const p = polar(R_MID + 6, LABEL_ANGLE)
        return (
          <text x={p.x} y={p.y} className={styles.midlineLabel} textAnchor="middle">
            OPTIMAL
          </text>
        )
      })()}

      {/* Planetary ceiling label */}
      {(() => {
        const p = polar(R_PLANET + 8, LABEL_ANGLE)
        return (
          <text x={p.x} y={p.y} className={styles.boundaryLabel} textAnchor="middle">
            PLANETARY CEILING
          </text>
        )
      })()}

      {/* Central zone label */}
      <text x={CX} y={CY + 14} textAnchor="middle" className={styles.centerLabel}>HABITABLE</text>
      <text x={CX} y={CY + 26} textAnchor="middle" className={styles.centerLabel}>ZONE</text>

      {/* ── Score ring ticks (at key values) ────────────────────────────── */}
      {[60, 70, 80].map(score => {
        const r = scoreToR(score)
        const p1 = polar(r - 4, 85)
        const p2 = polar(r + 4, 85)
        const lp = polar(r, 88)
        return (
          <g key={score}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={styles.tick} />
            <text x={lp.x + 8} y={lp.y + 3} className={styles.tickLabel}>{score}</text>
          </g>
        )
      })}

      {/* ── Agent dots ──────────────────────────────────────────────────── */}
      {agents && agentScores && agents.map((agent, i) => {
        const score = agentScores[agent.id]
        if (!score) return null

        const habitable = score.habitable ?? (score.social + score.planetary) / 2
        const r         = scoreToR(habitable)
        const angle     = agentAngles[i]
        const { x, y }  = polar(r, angle)
        const inZone    = habitable >= 60 && score.social >= 60 && score.planetary >= 60

        return (
          <g key={agent.id}>
            {/* Halo */}
            <circle cx={x} cy={y} r={16} fill={agent.color} className={styles.agentHalo} />
            {/* Dot */}
            <circle cx={x} cy={y} r={8} fill={agent.color} className={inZone ? styles.agentInZone : ''}>
              <title>
                {agent.name}: Social {score.social?.toFixed(1)}, Planetary {score.planetary?.toFixed(1)}, Habitable {habitable.toFixed(1)}
              </title>
            </circle>
            {/* Small inner indicator: social (left arc) vs planetary (right arc) */}
            <circle cx={x} cy={y} r={4}
              fill="none"
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={2}
            />
          </g>
        )
      })}

    </svg>
  )
}
