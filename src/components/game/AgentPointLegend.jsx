import styles from './AgentPointLegend.module.css'

export default function AgentPointLegend({ agents }) {
  return (
    <div className={styles.legend}>
      {agents.map(agent => (
        <div key={agent.id} className={styles.item}>
          <span className={styles.dot} style={{ background: agent.color }} />
          <span className={styles.name}>{agent.name}</span>
        </div>
      ))}
    </div>
  )
}
