import styles from './RingLegend.module.css'

export default function RingLegend() {
  return (
    <div className={styles.legend}>
      <div className={styles.title}>How to read this</div>

      <div className={styles.zones}>
        <div className={styles.zone}>
          <span className={styles.swatch} style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.4)' }} />
          <div>
            <div className={styles.zoneName}>Deprivation zone</div>
            <div className={styles.zoneDesc}>Social or planetary score below 60 — basic needs unmet or ecological damage occurring.</div>
          </div>
        </div>
        <div className={styles.zone}>
          <span className={styles.swatch} style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)' }} />
          <div>
            <div className={styles.zoneName}>Habitable zone</div>
            <div className={styles.zoneDesc}>Both scores 60–80. Safe and just space — the goal for every persona.</div>
          </div>
        </div>
        <div className={styles.zone}>
          <span className={styles.swatch} style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)' }} />
          <div>
            <div className={styles.zoneName}>Midline (score 70)</div>
            <div className={styles.zoneDesc}>Optimal equilibrium. Dots closest to this ring earn the highest zone score.</div>
          </div>
        </div>
        <div className={styles.zone}>
          <span className={styles.swatch} style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.4)' }} />
          <div>
            <div className={styles.zoneName}>Overshoot zone</div>
            <div className={styles.zoneDesc}>Planetary score above 80 — ecological ceiling exceeded. Penalised equally to deprivation.</div>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Social score</span>
          <span className={styles.metricDesc}>Measures human wellbeing — equity, health, housing, food security.</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Planetary score</span>
          <span className={styles.metricDesc}>Measures ecological impact — emissions, biodiversity, resource use.</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Zone score</span>
          <span className={styles.metricDesc}>100 = perfectly on midline (habitable avg = 70). Drops symmetrically for both over- and undershoot.</span>
        </div>
      </div>
    </div>
  )
}
