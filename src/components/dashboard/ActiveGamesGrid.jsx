import { useState, useEffect } from 'react'
import { fetchGames } from '../../api/mock'
import GameCard, { GameCardShimmer } from './GameCard'
import styles from './ActiveGamesGrid.module.css'

export default function ActiveGamesGrid() {
  const [games, setGames] = useState(null)

  useEffect(() => {
    let cancelled = false

    function load() {
      fetchGames().then(data => {
        if (!cancelled) setGames(data)
      })
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
      <div className={styles.grid}>
        {games === null
          ? Array.from({ length: 4 }).map((_, i) => <GameCardShimmer key={i} />)
          : games.map(game => <GameCard key={game.id} game={game} />)
        }
      </div>
    </div>
  )
}
