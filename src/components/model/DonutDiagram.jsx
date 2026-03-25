import { useMemo } from 'react'
import styles from './DonutDiagram.module.css'

const CX = 360
const CY = 360

const R = {
  hole:   82,
  social: 148,
  mid:    200,
  planet: 252,
  outer:  292,
}

const SOCIAL_DIMS = [
  'Food', 'Water', 'Health', 'Education',
  'Income', 'Peace', 'Voice', 'Equity',
  'Gender', 'Housing', 'Networks', 'Energy',
]

const PLANET_DIMS = [
  'Climate', 'Oceans', 'Chemicals',
  'Nutrients', 'Freshwater', 'Land Use',
  'Biodiversity', 'Air', 'Ozone',
]

// Wobbly circle path matching the Variant organic style
function wobblyCircle(cx, cy, radius, points = 80, variance = 0) {
  if (variance === 0) return null // use <circle> for exact rings
  let d = ''
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2
    const r = radius
      + Math.sin(angle * 5) * variance
      + Math.cos(angle * 13) * (variance / 2)
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) {
      d += `M ${x} ${y} `
    } else {
      const pAngle = ((i - 1) / points) * Math.PI * 2
      const pr = radius
        + Math.sin(pAngle * 5) * variance
        + Math.cos(pAngle * 13) * (variance / 2)
      const cp1x = cx + pr * Math.cos(pAngle + 0.05)
      const cp1y = cy + pr * Math.sin(pAngle + 0.05)
      const cp2x = cx + r * Math.cos(angle - 0.05)
      const cp2y = cy + r * Math.sin(angle - 0.05)
      d += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y} `
    }
  }
  return d
}

function polar(r, deg) {
  const rad = (deg - 90) * Math.PI / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function DimLabel({ label, r, angle }) {
  const [x, y] = polar(r, angle)
  const rot = angle > 180 ? angle + 90 : angle - 90
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="7"
      fill="rgba(244,244,240,0.5)"
      fontFamily="Space Mono, monospace"
      fontWeight="600"
      letterSpacing="0.8"
      transform={`rotate(${rot}, ${x}, ${y})`}
    >
      {label.toUpperCase()}
    </text>
  )
}

export default function DonutDiagram() {
  // Pre-compute wobbly paths
  const innerPath = useMemo(() => wobblyCircle(CX, CY, R.social, 60, 14), [])
  const outerPath = useMemo(() => wobblyCircle(CX, CY, R.planet, 80, 22), [])

  // Score ticks at 135°
  const [s60x, s60y] = polar(R.social, 135)
  const [s70x, s70y] = polar(R.mid,    135)
  const [s80x, s80y] = polar(R.planet, 135)
  const [sOx,  sOy]  = polar(R.outer + 10, 135)

  // Annotation positions
  const [sfx, sfy]  = polar(R.social,  48)
  const [pcx, pcy]  = polar(R.planet, 320)
  const [mlx, mly]  = polar(R.mid,     48)

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 720 720" className={styles.svg} aria-label="Doughnut economics diagram">
        <defs>
          <style>{`
            #donut-network {
              animation: slowRotate 180s linear infinite;
              transform-origin: 360px 360px;
            }
            @keyframes slowRotate {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </defs>

        <g id="donut-network">
          {/* ── Wobbly ring paths (organic style) ── */}
          <path
            d={innerPath}
            fill="none"
            stroke="#619b6e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={outerPath}
            fill="none"
            stroke="#e0dcd3"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── Midline — dashed ── */}
          <circle
            cx={CX} cy={CY} r={R.mid}
            fill="none"
            stroke="rgba(244,244,240,0.25)"
            strokeWidth="1.5"
            strokeDasharray="7 5"
          />

          {/* ── Branches between rings ── */}
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * Math.PI * 2 + (i % 3 === 0 ? 0.1 : 0)
            const startR = R.social + (i % 2 === 0 ? 6 : -6)
            const endR   = R.planet + (i % 3 === 0 ? 10 : -8)
            const x1 = CX + startR * Math.cos(angle)
            const y1 = CY + startR * Math.sin(angle)
            const x2 = CX + endR   * Math.cos(angle)
            const y2 = CY + endR   * Math.sin(angle)
            const midR = (startR + endR) / 2
            const mAngle = angle + (i % 4 === 0 ? 0.25 : -0.18)
            const cpx = CX + midR * Math.cos(mAngle)
            const cpy = CY + midR * Math.sin(mAngle)
            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(244,244,240,0.18)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Outer node */}
                <circle cx={x2} cy={y2} r={4 + (i % 3)} fill="#619b6e" />
                {/* Inner node (alternating) */}
                {i % 2 === 0 && <circle cx={x1} cy={y1} r={3 + (i % 2)} fill="#e0dcd3" />}
              </g>
            )
          })}

          {/* ── Social dimension labels ── */}
          {SOCIAL_DIMS.map((label, i) => (
            <DimLabel
              key={label}
              label={label}
              r={(R.hole + R.social) / 2}
              angle={(i / SOCIAL_DIMS.length) * 360}
            />
          ))}

          {/* ── Planetary boundary labels ── */}
          {PLANET_DIMS.map((label, i) => (
            <DimLabel
              key={label}
              label={label}
              r={(R.planet + R.outer) / 2 + 2}
              angle={(i / PLANET_DIMS.length) * 360}
            />
          ))}
        </g>

        {/* ── Score indicator (outside rotating group) ── */}
        <line
          x1={CX} y1={CY}
          x2={sOx} y2={sOy}
          stroke="rgba(244,244,240,0.1)"
          strokeWidth="1"
        />
        {[
          { x: s60x, y: s60y, score: 60, r: R.social },
          { x: s70x, y: s70y, score: 70, r: R.mid    },
          { x: s80x, y: s80y, score: 80, r: R.planet },
        ].map(({ x, y, score, r }) => {
          const offset = 15
          const rad = (135 - 90) * Math.PI / 180
          return (
            <g key={score}>
              <circle cx={x} cy={y} r="3" fill="#f4f4f0" />
              <text
                x={x + offset * Math.cos(rad)}
                y={y + offset * Math.sin(rad)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="700"
                fill="#f4f4f0"
                fontFamily="Space Mono, monospace"
              >
                {score}
              </text>
            </g>
          )
        })}

        {/* ── Ring annotation labels (static) ── */}
        <text x={sfx + 8} y={sfy - 7} fontSize="8" fill="rgba(244,244,240,0.6)" fontFamily="Space Mono, monospace" fontWeight="700" letterSpacing="0.5">
          SOCIAL FLOOR
        </text>
        <text x={pcx} y={pcy - 10} fontSize="8" fill="rgba(224,220,211,0.7)" fontFamily="Space Mono, monospace" fontWeight="700" letterSpacing="0.5" textAnchor="middle">
          PLANETARY CEILING
        </text>
        <text x={mlx + 7} y={mly - 7} fontSize="8" fill="rgba(244,244,240,0.4)" fontFamily="Space Mono, monospace" fontWeight="700" letterSpacing="0.5">
          OPTIMAL MIDLINE
        </text>

        {/* ── Center text ── */}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize="11" fill="rgba(244,244,240,0.25)" fontFamily="DM Sans, sans-serif" fontWeight="800" letterSpacing="4">
          QUORUM
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" fontSize="8" fill="rgba(244,244,240,0.15)" fontFamily="Space Mono, monospace" fontWeight="400" letterSpacing="1">
          SAFE &amp; JUST SPACE
        </text>
      </svg>

      {/* ── Legend ── */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'rgba(244,244,240,0.08)', borderColor: 'rgba(244,244,240,0.2)' }} />
          <div>
            <div className={styles.legendLabel}>Deprivation Zone</div>
            <div className={styles.legendDesc}>Score below 60 — social floor unmet</div>
          </div>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'rgba(97,155,110,0.3)', border: '2px solid #619b6e' }} />
          <div>
            <div className={styles.legendLabel}>Habitable Zone</div>
            <div className={styles.legendDesc}>Both scores 60–80</div>
          </div>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: '#f4f4f0', borderColor: '#f4f4f0' }} />
          <div>
            <div className={styles.legendLabel}>Optimal Midline (70)</div>
            <div className={styles.legendDesc}>Zone score = 100 here</div>
          </div>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'rgba(217,92,80,0.15)', border: '2px dashed rgba(217,92,80,0.6)' }} />
          <div>
            <div className={styles.legendLabel}>Overshoot Zone</div>
            <div className={styles.legendDesc}>Planetary ceiling exceeded</div>
          </div>
        </div>
      </div>
    </div>
  )
}
