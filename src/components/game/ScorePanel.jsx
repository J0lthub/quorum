import { PERSONAS } from '../../api/mock'
import { isInZone, computeHabitableScore } from '../../hooks/useGame'
import styles from './ScorePanel.module.css'

function getPersona(personaId) {
  return PERSONAS.find(p => p.id === personaId)
}

export default function ScorePanel({ agents, agentScores, bestScore }) {
  if (!agents || !agentScores) return null

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Agent Scores</h2>
      {agents.map(agent => {
        const score = agentScores[agent.id]
        if (!score) return null
        const persona = getPersona(agent.personaId)
        const color = persona?.color || '#6b7068'
        const name = persona?.name || agent.personaId
        const inZone = isInZone(score.social, score.planetary)
        const hScore = computeHabitableScore(score.social, score.planetary)
        const isBest = hScore != null && bestScore != null && Math.abs(hScore - bestScore) < 0.01

        return (
          <div
            key={agent.id}
            className={`${styles.row} ${isBest ? styles.best : ''}`}
          >
            <span className={styles.dot} style={{ background: color }} />
            <span className={styles.name}>{name}</span>
            {isBest && <span className={styles.bestBadge}>BEST</span>}
            <div className={styles.scores}>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>Social</span>
                <span className={styles.scoreVal}>{score.social.toFixed(0)}</span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>Planet</span>
                <span className={styles.scoreVal}>{score.planetary.toFixed(0)}</span>
              </div>
            </div>
            <span className={styles.zoneCheck}>{inZone ? '✓' : '✗'}</span>
            <span className={`${styles.habitableScore} ${!inZone ? styles.outside : ''}`}>
              {hScore != null ? hScore.toFixed(1) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
