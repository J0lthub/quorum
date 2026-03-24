import { useState, useEffect, useRef } from 'react'
import { fetchGame } from '../api/mock'
import { isInZone, computeHabitableScore } from '../utils/scoring'

// structuredClone handles all serializable types; switch to custom clone if non-serializable data is added
function deepCopy(obj) { return structuredClone(obj) }

export function useGame(id) {
  const [game, setGame] = useState(null)
  const [agentScores, setAgentScores] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef(null)

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

      if (cancelled) return
      if (g !== null) {
        intervalRef.current = setInterval(() => {
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
      }
    })

    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
    }
  }, [id])

  const bestScore = agentScores
    ? (() => {
        const inZoneScores = Object.values(agentScores)
          .filter(s => isInZone(s.social, s.planetary))
          .map(s => computeHabitableScore(s.social, s.planetary))
        return inZoneScores.length > 0 ? Math.max(...inZoneScores) : null
      })()
    : null

  const bestAgentId = agentScores
    ? (() => {
        let best = null
        let bestVal = -Infinity
        for (const [agentId, s] of Object.entries(agentScores)) {
          if (isInZone(s.social, s.planetary)) {
            const avg = (s.social + s.planetary) / 2
            if (avg > bestVal) { bestVal = avg; best = agentId }
          }
        }
        return best
      })()
    : null

  return { game, agentScores, bestScore, bestAgentId, isLoading }
}
