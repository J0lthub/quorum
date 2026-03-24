import styles from './ScoreChart.module.css'

const W = 460
const H = 150
const PAD = { top: 14, right: 14, bottom: 24, left: 32 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function toX(iter, maxIter) {
  return PAD.left + (iter / Math.max(maxIter, 1)) * PLOT_W
}
function toY(val) {
  return PAD.top + PLOT_H - (val / 100) * PLOT_H
}

const Y_TICKS = [0, 25, 50, 60, 75, 100]

/**
 * datasets: [{ id, color, name, history: [{iteration, social, planetary, habitable}] }]
 *
 * Single dataset  → shows social (persona color) + planetary (dashed, lighter)
 * Multiple datasets → shows habitable line per agent, colored by persona
 */
export default function ScoreChart({ datasets = [], activePoint, onSelectPoint }) {
  if (!datasets.length || !datasets[0].history?.length) return null

  const maxIter = Math.max(...datasets.map(d => d.history[d.history.length - 1]?.iteration ?? 0))
  const multi   = datasets.length > 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} aria-label="Score chart">

      {/* Grid */}
      {Y_TICKS.map(v => (
        <g key={v}>
          <line
            x1={PAD.left} y1={toY(v)} x2={PAD.left + PLOT_W} y2={toY(v)}
            className={v === 60 ? styles.gridZone : styles.grid}
          />
          <text x={PAD.left - 4} y={toY(v) + 4} className={styles.axisLabel} textAnchor="end">{v}</text>
        </g>
      ))}
      <text x={PAD.left + PLOT_W} y={toY(60) - 4} className={styles.zoneLabel} textAnchor="end">zone</text>

      {datasets.map(({ id, color, history }) => {
        if (multi) {
          // One habitable line per agent
          const pts = history.map(h => ({ x: toX(h.iteration, maxIter), y: toY(h.habitable), h, agentId: id }))
          return (
            <g key={id}>
              <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} className={styles.line} stroke={color} />
              {pts.map((p, i) => {
                const isActive = activePoint?.agentId === id && activePoint?.iteration === p.h.iteration
                return (
                  <circle
                    key={i} cx={p.x} cy={p.y}
                    r={isActive ? 6 : 3.5}
                    className={`${styles.dot} ${isActive ? styles.active : ''}`}
                    fill={color}
                    onClick={() => onSelectPoint?.({ agentId: id, ...p.h })}
                  />
                )
              })}
            </g>
          )
        } else {
          // Single agent: social (solid) + planetary (dashed)
          const spts = history.map(h => ({ x: toX(h.iteration, maxIter), y: toY(h.social),    h }))
          const ppts = history.map(h => ({ x: toX(h.iteration, maxIter), y: toY(h.planetary), h }))
          return (
            <g key={id}>
              <polyline points={ppts.map(p => `${p.x},${p.y}`).join(' ')} className={styles.line} stroke="#64b5f6" strokeDasharray="4 2" />
              <polyline points={spts.map(p => `${p.x},${p.y}`).join(' ')} className={styles.line} stroke={color} />
              {spts.map((p, i) => {
                const isActive = activePoint?.iteration === p.h.iteration
                return (
                  <circle
                    key={`s${i}`} cx={p.x} cy={p.y}
                    r={isActive ? 6 : 3.5}
                    className={`${styles.dot} ${isActive ? styles.active : ''}`}
                    fill={color}
                    onClick={() => onSelectPoint?.({ agentId: id, ...p.h })}
                  />
                )
              })}
              {ppts.map((p, i) => (
                <circle
                  key={`p${i}`} cx={p.x} cy={p.y}
                  r={3}
                  className={styles.dot}
                  fill="#64b5f6"
                  onClick={() => onSelectPoint?.({ agentId: id, ...p.h })}
                />
              ))}
            </g>
          )
        }
      })}

      {/* X-axis */}
      {datasets[0].history
        .filter((_, i, a) => i === 0 || i === a.length - 1 || i % 2 === 0)
        .map(h => (
          <text key={h.iteration} x={toX(h.iteration, maxIter)} y={H - 5}
            className={styles.axisLabel} textAnchor="middle">{h.iteration}</text>
        ))
      }

      {/* Legend (single agent only) */}
      {!multi && (
        <>
          <circle cx={PAD.left + 2}  cy={PAD.top + 7} r={3} fill={datasets[0].color} />
          <text x={PAD.left + 8}  y={PAD.top + 11} className={styles.legendLabel}>Social</text>
          <circle cx={PAD.left + 46} cy={PAD.top + 7} r={3} fill="#64b5f6" />
          <text x={PAD.left + 52} y={PAD.top + 11} className={styles.legendLabel}>Planetary</text>
        </>
      )}
    </svg>
  )
}
