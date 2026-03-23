import { useState, useEffect } from 'react'
import { fetchLiveStats } from '../api/mock'

export function useLiveStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchLiveStats().then(data => {
      if (!cancelled) setStats(data)
    })

    const id = setInterval(() => {
      fetchLiveStats().then(data => {
        if (!cancelled) setStats(data)
      })
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return stats
}
