import { useState, useEffect, useRef } from 'react'
import { fetchGames } from '../../api/client.js'
import GameCard, { GameCardShimmer } from './GameCard'
import styles from './ActiveGamesGrid.module.css'

export default function ActiveGamesGrid() {
  const [games, setGames] = useState(null)
  const [error, setError] = useState(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    function load() {
      if (inFlightRef.current) return
      inFlightRef.current = true
      fetchGames().then(data => {
        if (!cancelled) setGames(data)
      }).catch(err => {
        if (!cancelled) setError('Failed to load games.')
      }).finally(() => { inFlightRef.current = false })
    }

    load()
    const id_interval = setInterval(load, 10000)

    return () => {
      cancelled = true
      clearInterval(id_interval)
    }
  }, [])

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Active Games</h2>
      {error && <span>{error}</span>}
      <div className={styles.grid}>
        {games === null
          ? Array.from({ length: 4 }).map((_, i) => <GameCardShimmer key={i} />)
          : games.map(game => <GameCard key={game.id} game={game} />)
        }
      </div>
    </div>
  )
}
