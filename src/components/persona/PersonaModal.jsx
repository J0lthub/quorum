import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PERSONAS, createGame } from '../../api/mock'
import PersonaCard from './PersonaCard'
import styles from './PersonaModal.module.css'

export default function PersonaModal({ question, onClose }) {
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleToggle(personaId) {
    setSelected(prev => {
      if (prev.includes(personaId)) {
        return prev.filter(id => id !== personaId)
      }
      if (prev.length >= 5) return prev
      return [...prev, personaId]
    })
  }

  async function handleStart() {
    if (selected.length < 2 || loading) return
    setLoading(true)
    try {
      const game = await createGame({ question, agents: selected })
      navigate(`/game/${game.id}`)
    } catch (err) {
      console.error('createGame failed', err)
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Select agent personas">
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>Choose Agent Personas</h2>
            <p className={styles.question}>"{question}"</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className={styles.subTitle}>
          Select 2–5 personas ({selected.length}/5 selected)
        </p>

        <div className={styles.grid}>
          {PERSONAS.map(persona => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              selected={selected.includes(persona.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.teamPreview}>
            <span className={styles.teamLabel}>Selected agents:</span>
            {selected.map(id => {
              const persona = PERSONAS.find(p => p.id === id)
              if (!persona) return null
              return (
                <span
                  key={id}
                  className={styles.teamChip}
                  style={{ background: persona.color + '22', color: persona.color }}
                >
                  <span className={styles.teamDot} style={{ background: persona.color }} />
                  {persona.name}
                </span>
              )
            })}
          </div>
          {loading ? (
            <span className={styles.loadingText}>Starting game…</span>
          ) : (
            <button
              className={styles.startBtn}
              disabled={selected.length < 2}
              onClick={handleStart}
            >
              Start Game →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
