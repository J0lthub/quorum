import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PERSONAS } from '../api/client.js'
import { useGame } from '../hooks/useGame'
import { elapsed } from '../utils/elapsed'
import TopBar from '../components/layout/TopBar'
import HabitableZoneRing from '../components/game/HabitableZoneRing'
import AgentPointLegend from '../components/game/AgentPointLegend'
import ScorePanel from '../components/game/ScorePanel'
import AgentHistoryPanel from '../components/game/AgentHistoryPanel'
import styles from './GameView.module.css'

function enrichAgents(agents) {
  return agents.map(agent => {
    const persona = PERSONAS.find(p => p.id === agent.personaId)
    return { ...agent, color: persona?.color || '#6b7068', name: persona?.name || agent.personaId }
  })
}

export default function GameView() {
  const { id: gameId } = useParams()
  const { game, agentScores, bestScore, bestAgentId, isLoading, gameStatus } = useGame(gameId)
  const [selectedIds, setSelectedIds] = useState([])

  function handleSelectAgent(agentId) {
    setSelectedIds(prev => {
      if (prev.includes(agentId)) return prev.filter(id => id !== agentId)
      if (prev.length >= 5) return prev
      return [...prev, agentId]
    })
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <TopBar />
        <div className={styles.inner}><p className={styles.loading}>Loading game…</p></div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className={styles.page}>
        <TopBar />
        <div className={styles.inner}>
          <p className={styles.notFound}>Game not found. <Link to="/" style={{ color: 'var(--color-amber)' }}>← Back</Link></p>
        </div>
      </div>
    )
  }

  const enriched      = enrichAgents(game.agents)
  const displayStatus = gameStatus ?? game?.status
  const selectedAgents = enriched.filter(a => selectedIds.includes(a.id))

  return (
    <div className={styles.page}>
      <TopBar />
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <Link to="/" className={styles.backLink}>←</Link>
          <h1 className={styles.question}>{game.question}</h1>
          <span className={`${styles.statusBadge} ${styles[displayStatus]}`}>
            {displayStatus === 'active' ? 'LIVE' : 'DONE'}
          </span>
          <span className={styles.elapsed}>{elapsed(game.startedAt)}</span>
        </div>

        {/* Main grid */}
        <div className={styles.mainGrid}>
          <div className={styles.ringCol}>
            <HabitableZoneRing agents={enriched} agentScores={agentScores} bestScore={bestScore} />
            <AgentPointLegend agents={enriched} />
          </div>
          <ScorePanel
            agents={enriched}
            agentScores={agentScores}
            bestAgentId={bestAgentId}
            selectedAgentIds={selectedIds}
            onSelectAgent={handleSelectAgent}
          />
        </div>

        {/* History panel — shown when ≥1 agent selected */}
        {selectedAgents.length > 0 && (
          <AgentHistoryPanel
            key={selectedIds.join(',')}
            gameId={gameId}
            agents={selectedAgents}
            onClose={() => setSelectedIds([])}
          />
        )}

      </div>
    </div>
  )
}
