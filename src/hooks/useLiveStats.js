import { useState, useEffect, useRef } from 'react'
import { fetchLiveStats } from '../api/client.js'

export function useLiveStats() {
  const [stats, setStats] = useState(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    if (!inFlightRef.current) {
      inFlightRef.current = true
      fetchLiveStats().then(data => {
        if (!cancelled) setStats(data)
      }).finally(() => { inFlightRef.current = false })
    }

    const id = setInterval(() => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      fetchLiveStats().then(data => {
        if (!cancelled) setStats(data)
      }).finally(() => { inFlightRef.current = false })
    }, 5000)

    return () => {
      cancelled = true
      inFlightRef.current = false
      clearInterval(id)
    }
  }, [])

  return stats
}
