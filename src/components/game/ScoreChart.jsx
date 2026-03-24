import { useState } from 'react'
import styles from './ScoreChart.module.css'

const W = 440
const H = 160
const PAD = { top: 16, right: 16, bottom: 28, left: 36 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function toX(iter, maxIter) {
  return PAD.left + (iter / Math.max(maxIter, 1)) * PLOT_W
}
function toY(val) {
  return PAD.top + PLOT_H - (val / 100) * PLOT_H
}

export default function ScoreChart({ history, socialColor, planetaryColor, activeIteration, onSelectIteration }) {
  if (!history || history.length === 0) return null

  const maxIter = history[history.length - 1]?.iteration ?? history.length - 1
  const socialPoints  = history.map(h => ({ x: toX(h.iteration, maxIter), y: toY(h.social),    iter: h.iteration }))
  const planetPoints  = history.map(h => ({ x: toX(h.iteration, maxIter), y: toY(h.planetary), iter: h.iteration }))

  const toPolyline = pts => pts.map(p => `${p.x},${p.y}`).join(' ')

  // Y-axis tick labels
  const yTicks = [0, 25, 50, 60, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} aria-label="Score chart">
      {/* Grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line
            x1={PAD.left} y1={toY(v)} x2={PAD.left + PLOT_W} y2={toY(v)}
            className={v === 60 ? styles.gridZone : styles.grid}
          />
          <text x={PAD.left - 4} y={toY(v) + 4} className={styles.axisLabel} textAnchor="end">{v}</text>
        </g>
      ))}

      {/* Zone threshold label */}
      <text x={PAD.left + PLOT_W} y={toY(60) - 4} className={styles.zoneLabel} textAnchor="end">zone floor</text>

      {/* Lines */}
      <polyline points={toPolyline(planetPoints)} className={styles.line} stroke={planetaryColor} />
      <polyline points={toPolyline(socialPoints)}  className={styles.line} stroke={socialColor} />

      {/* Dots — planet */}
      {planetPoints.map((p, i) => (
        <circle
          key={`p${i}`}
          cx={p.x} cy={p.y} r={p.iter === activeIteration ? 6 : 4}
          className={`${styles.dot} ${p.iter === activeIteration ? styles.active : ''}`}
          fill={planetaryColor}
          onClick={() => onSelectIteration?.(history[i])}
        />
      ))}

      {/* Dots — social */}
      {socialPoints.map((p, i) => (
        <circle
          key={`s${i}`}
          cx={p.x} cy={p.y} r={p.iter === activeIteration ? 6 : 4}
          className={`${styles.dot} ${p.iter === activeIteration ? styles.active : ''}`}
          fill={socialColor}
          onClick={() => onSelectIteration?.(history[i])}
        />
      ))}

      {/* X-axis labels */}
      {history.filter((_, i) => i % 2 === 0 || i === history.length - 1).map(h => (
        <text
          key={h.iteration}
          x={toX(h.iteration, maxIter)} y={H - 6}
          className={styles.axisLabel} textAnchor="middle"
        >
          {h.iteration}
        </text>
      ))}

      {/* Legend */}
      <circle cx={PAD.left + 4}  cy={PAD.top + 6} r={3} fill={socialColor} />
      <text x={PAD.left + 10} y={PAD.top + 10} className={styles.legendLabel}>Social</text>
      <circle cx={PAD.left + 52} cy={PAD.top + 6} r={3} fill={planetaryColor} />
      <text x={PAD.left + 58} y={PAD.top + 10} className={styles.legendLabel}>Planetary</text>
    </svg>
  )
}
