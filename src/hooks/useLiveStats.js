import { useState, useEffect } from 'react'
import { fetchLiveStats } from '../api/mock'

export function useLiveStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    if (!inFlight) {
      inFlight = true
      fetchLiveStats().then(data => {
        if (!cancelled) setStats(data)
      }).finally(() => { inFlight = false })
    }

    const id = setInterval(() => {
      if (inFlight) return
      inFlight = true
      fetchLiveStats().then(data => {
        if (!cancelled) setStats(data)
      }).finally(() => { inFlight = false })
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return stats
}
