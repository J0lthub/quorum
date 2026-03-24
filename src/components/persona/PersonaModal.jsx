import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PERSONAS, createGame } from '../../api/mock'
import PersonaCard from './PersonaCard'
import styles from './PersonaModal.module.css'

export default function PersonaModal({ question, onClose }) {
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (dialogRef.current) dialogRef.current.focus()
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Tab') {
      const focusable = Array.from(
        dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }

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
    setError(null)
    try {
      const game = await createGame({ question, agents: selected })
      onClose()
      navigate(`/game/${game.id}`)
    } catch (err) {
      console.error('createGame failed', err)
      setError('Failed to start game. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={dialogRef} tabIndex={-1} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="persona-modal-title" onKeyDown={handleKeyDown}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 id="persona-modal-title" className={styles.title}>Choose Agent Personas</h2>
            <p className={styles.question}>"{question}"</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className={styles.subTitle}>
          Select 2–5 personas ({selected.length}/5 selected)
        </p>

        <div className={styles.grid} role="group" aria-label="Agent persona options">
          {PERSONAS.map(persona => {
            const isSelected = selected.includes(persona.id)
            const isDisabled = selected.length >= 5 && !isSelected
            return (
              <PersonaCard
                key={persona.id}
                persona={persona}
                selected={isSelected}
                isDisabled={isDisabled}
                onToggle={handleToggle}
              />
            )
          })}
        </div>

        {error && <p className={styles.error}>{error}</p>}

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
