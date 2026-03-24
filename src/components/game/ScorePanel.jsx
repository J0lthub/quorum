import { PERSONAS } from '../../api/client.js'
import { isInZone, computeHabitableScore, computeZoneScore } from '../../utils/scoring'
import styles from './ScorePanel.module.css'

function getPersona(personaId) {
  return PERSONAS.find(p => p.id === personaId)
}

export default function ScorePanel({ agents, agentScores, bestAgentId, selectedAgentIds = [], onSelectAgent }) {
  if (!agents || !agentScores) return null

  const count = selectedAgentIds.length

  return (
    <div className={styles.panel}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Agents</h2>
        {count > 0 && (
          <span className={styles.selectCount}>{count}/5 in chart</span>
        )}
        <span className={styles.hint}>zone score / habitable</span>
      </div>
      {agents.map(agent => {
        const score = agentScores[agent.id]
        if (!score) return null
        const persona    = getPersona(agent.personaId)
        const color      = persona?.color || '#6b7068'
        const name       = persona?.name  || agent.personaId
        const inZone     = isInZone(score.social, score.planetary)
        const hScore     = computeHabitableScore(score.social, score.planetary)
        const zScore     = computeZoneScore(score.social, score.planetary)
        const isBest     = agent.id === bestAgentId
        const isSelected = selectedAgentIds.includes(agent.id)
        const atMax      = count >= 5 && !isSelected

        return (
          <button
            key={agent.id}
            className={`${styles.row} ${isBest ? styles.best : ''} ${isSelected ? styles.selected : ''} ${atMax ? styles.dimmed : ''}`}
            onClick={() => onSelectAgent?.(agent.id)}
            title={atMax ? 'Max 5 personas in chart' : undefined}
          >
            <div className={styles.rowTop}>
              <span className={styles.dot} style={{ background: color }} />
              <span className={styles.name}>{name}</span>
              {isBest && <span className={styles.bestBadge}>BEST</span>}
              <div className={styles.scores}>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>S</span>
                  <span className={styles.scoreVal}>{score.social.toFixed(0)}</span>
                </div>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>P</span>
                  <span className={styles.scoreVal}>{score.planetary.toFixed(0)}</span>
                </div>
              </div>
              <span className={styles.zoneCheck}>{inZone ? '✓' : '✗'}</span>
              <span className={`${styles.habitableScore} ${!inZone ? styles.outside : ''}`}>
                {inZone ? `${zScore.toFixed(0)}` : '—'}
              </span>
              {inZone && (
                <span className={styles.hintLabel}>
                  H{hScore?.toFixed(0)}
                </span>
              )}
            </div>
            {score.decision && (
              <div className={styles.decision}>
                <span className={styles.decisionText}>{score.decision}</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
