import { Link } from 'react-router-dom'
import { PERSONAS } from '../../api/mock'
import { elapsed } from '../../utils/elapsed'
import { ZONE_THRESHOLD, BORDERLINE_THRESHOLD } from '../../utils/scoring'
import styles from './GameCard.module.css'

function getPersonaColor(personaId) {
  const p = PERSONAS.find(p => p.id === personaId)
  return p ? p.color : '#6b7068'
}

function getScoreInfo(scores) {
  if (!scores) return { best: null, label: '—', tier: 'red' }
  const vals = Object.values(scores)
  const inZone = vals.filter(s => s.social >= ZONE_THRESHOLD && s.planetary >= ZONE_THRESHOLD)
  if (inZone.length === 0) {
    // amber if both scores are in borderline range (>=50 on each axis, below zone threshold)
    const borderline = vals.filter(s => (s.social >= BORDERLINE_THRESHOLD && s.planetary >= BORDERLINE_THRESHOLD))
    const tier = borderline.length > 0 ? 'amber' : 'red'
    return { best: null, label: 'out of zone', tier }
  }
  const best = Math.max(...inZone.map(s => (s.social + s.planetary) / 2))
  return { best, label: best.toFixed(1), tier: 'green' }
}


export function GameCardShimmer() {
  return (
    <div className={styles.shimmer}>
      <div className={styles.shimmerLine} style={{ width: '90%' }} />
      <div className={styles.shimmerLine} style={{ width: '60%', height: '10px' }} />
      <div className={styles.shimmerLine} style={{ width: '40%', height: '10px' }} />
    </div>
  )
}

export default function GameCard({ game }) {
  const { best, label, tier } = getScoreInfo(game.scores)
  const inZoneAgents = game.agents.filter(agent => {
    const s = game.scores[agent.id]
    return s && s.social >= ZONE_THRESHOLD && s.planetary >= ZONE_THRESHOLD
  })
  const candidateAgents = inZoneAgents.length > 0 ? inZoneAgents : game.agents
  const bestAgent = candidateAgents.reduce((acc, agent) => {
    const s = game.scores[agent.id]
    if (!s) return acc
    const score = (s.social + s.planetary) / 2
    return score > acc.score ? { agent, score } : acc
  }, { agent: null, score: -Infinity })
  const topColor = bestAgent.agent ? getPersonaColor(bestAgent.agent.personaId) : 'var(--color-border)'

  return (
    <div className={styles.card}>
      <div className={styles.topBorder} style={{ background: topColor }} />
      <div className={styles.question}>{game.question}</div>
      <div className={styles.meta}>
        <div className={styles.agents}>
          {game.agents.map(agent => (
            <span
              key={agent.id}
              className={styles.agentDot}
              style={{ background: getPersonaColor(agent.personaId) }}
              title={PERSONAS.find(p => p.id === agent.personaId)?.name || agent.personaId}
            />
          ))}
        </div>
        <div className={styles.right}>
          {game.status === 'active' && (
            <span className={styles.livePulse}>
              <span className={styles.liveDot} />
              LIVE
            </span>
          )}
          <span className={`${styles.scoreBadge} ${styles[tier]}`}>{label}</span>
          <span className={styles.elapsed}>{elapsed(game.startedAt)}</span>
        </div>
      </div>
      <Link to={`/game/${game.id}`} className={styles.watchLink}>Watch →</Link>
    </div>
  )
}
