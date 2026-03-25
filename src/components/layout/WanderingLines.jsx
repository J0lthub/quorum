import styles from './WanderingLines.module.css'

export default function WanderingLines() {
  return (
    <svg
      className={styles.lines}
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M-50,200 Q 150,150 200,300 T 400,250 T 600,450 T 900,300 Q 1100,500 1500,400" />
      <path d="M300,-50 Q 250,150 350,250 T 200,450 T 300,700 T 150,950" />
      <path d="M1000,950 Q 900,800 1100,700 T 1200,500 T 1400,600 T 1500,500" strokeDasharray="10 20" />
      <path d="M-50,800 Q 200,850 300,750 T 450,850 T 600,700" />
    </svg>
  )
}
