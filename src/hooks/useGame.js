import { useState, useEffect } from 'react'
import { fetchGame } from '../api/mock'
import { isInZone, computeHabitableScore } from '../utils/scoring'

export { isInZone, computeHabitableScore }

function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)) }

export function useGame(id) {
  const [game, setGame] = useState(null)
  const [agentScores, setAgentScores] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setGame(null)
    setAgentScores(null)
    setIsLoading(true)

    let cancelled = false

    fetchGame(id).then(g => {
      if (cancelled) return
      setGame(g)
      setAgentScores(g ? deepCopy(g.scores) : null)
      setIsLoading(false)
    })

    const id_interval = setInterval(() => {
      setAgentScores(prev => {
        if (!prev) return prev
        const next = deepCopy(prev)
        for (const agent of Object.keys(next)) {
          next[agent].social    = Math.min(100, Math.max(0, next[agent].social    + (Math.random() * 4 - 2)))
          next[agent].planetary = Math.min(100, Math.max(0, next[agent].planetary + (Math.random() * 4 - 2)))
        }
        return next
      })
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(id_interval)
    }
  }, [id])

  const bestScore = agentScores
    ? (() => {
        const inZoneScores = Object.values(agentScores)
          .filter(s => s.social >= 60 && s.planetary >= 60)
          .map(s => (s.social + s.planetary) / 2)
        return inZoneScores.length > 0 ? Math.max(...inZoneScores) : null
      })()
    : null

  return { game, agentScores, bestScore, isLoading }
}
