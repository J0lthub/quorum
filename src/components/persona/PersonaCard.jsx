import styles from './PersonaCard.module.css'

export default function PersonaCard({ persona, selected, isDisabled, onToggle }) {
  function handleClick() {
    if (isDisabled && !selected) return
    onToggle(persona.id)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isDisabled && !selected) return
      onToggle(persona.id)
    }
  }

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      style={{ '--personaColor': persona.color }}
      onClick={handleClick}
      role="checkbox"
      aria-checked={selected}
      aria-disabled={isDisabled}
      tabIndex={isDisabled && !selected ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.header}>
        <span className={styles.icon}>{persona.icon}</span>
        <span className={styles.name}>{persona.name}</span>
        {selected && (
          <span
            className={styles.check}
            style={{ background: persona.color }}
          >
            ✓
          </span>
        )}
      </div>
      <p className={styles.blurb}>{persona.blurb}</p>
      <div className={styles.priorities}>
        {persona.priorities.map(tag => (
          <span key={tag} className={styles.tag}>{tag}</span>
        ))}
      </div>
    </div>
  )
}
