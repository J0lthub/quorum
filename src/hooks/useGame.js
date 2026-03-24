import { useState, useEffect, useRef } from 'react'
import { fetchGame, tickGame } from '../api/client.js'
import { isInZone, computeHabitableScore, computeZoneScore } from '../utils/scoring'

// structuredClone handles all serializable types; switch to custom clone if non-serializable data is added
function deepCopy(obj) { return structuredClone(obj) }

export function useGame(gameId) {
  const [game, setGame] = useState(null)
  const [agentScores, setAgentScores] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gameStatus, setGameStatus] = useState(null)
  const intervalRef = useRef(null)
  const tickInFlightRef = useRef(false)

  useEffect(() => {
    setGame(null)
    setAgentScores(null)
    setIsLoading(true)

    let cancelled = false

    fetchGame(gameId).then(g => {
      if (cancelled) return
      setGame(g)
      setAgentScores(g ? deepCopy(g.scores) : null)
      setIsLoading(false)

      // If the game was already completed when loaded (e.g. page refresh on a
      // finished game), do NOT start the tick interval. Mark it done immediately.
      if (g?.status === 'completed') {
        setGameStatus('completed')
        return
      }

      if (cancelled) return
      if (g !== null) {
        // Start the tick interval only after initial data has loaded.
        // Use a ref so the in-flight flag survives re-renders and the .finally()
        // callback does not trigger setState on an unmounted component.
        tickInFlightRef.current = false
        intervalRef.current = setInterval(() => {
          if (tickInFlightRef.current) return
          tickInFlightRef.current = true
          tickGame(gameId).then(result => {   // gameId — NOT `id`
            if (cancelled) return
            // Only update scores if the response contains data
            if (result.scores && Object.keys(result.scores).length > 0) setAgentScores(result.scores)
            if (result.completed === true) {
              clearInterval(intervalRef.current)
              setGameStatus('completed')
            }
          }).catch(err => {
            console.error('tick failed', err)
          }).finally(() => {
            tickInFlightRef.current = false
          })
        }, 2000)
      }
    }).catch(err => {
      if (!cancelled) setIsLoading(false)
    })

    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
    }
  }, [gameId])

  // bestScore = highest zone score among in-zone agents (100 = perfectly on midline)
  const bestScore = agentScores
    ? (() => {
        const zoneScores = Object.values(agentScores)
          .filter(s => isInZone(s.social, s.planetary))
          .map(s => computeZoneScore(s.social, s.planetary))
        return zoneScores.length > 0 ? Math.max(...zoneScores) : null
      })()
    : null

  // bestAgentId = agent closest to the habitable zone midline
  const bestAgentId = agentScores
    ? (() => {
        let best = null
        let bestVal = -Infinity
        for (const [agentId, s] of Object.entries(agentScores)) {
          if (isInZone(s.social, s.planetary)) {
            const z = computeZoneScore(s.social, s.planetary)
            if (z > bestVal) { bestVal = z; best = agentId }
          }
        }
        return best
      })()
    : null

  return { game, agentScores, bestScore, bestAgentId, isLoading, gameStatus }
}
