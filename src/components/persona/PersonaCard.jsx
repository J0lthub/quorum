import styles from './PersonaCard.module.css'

export default function PersonaCard({ persona, selected, onToggle }) {
  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      style={{ '--personaColor': persona.color }}
      onClick={() => onToggle(persona.id)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggle(persona.id) }}
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
