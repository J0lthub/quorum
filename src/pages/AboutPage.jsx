import TopBar from '../components/layout/TopBar'
import { Link } from 'react-router-dom'
import styles from './AboutPage.module.css'

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <TopBar />

      {/* ── Hero — earth ──────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}>About · Quorum</div>
        <h1 className={styles.headline}>
          How do you get an agent<br />to do only good?
        </h1>
        <p className={styles.lede}>
          Not with rules. Not with restrictions.<br />
          With competition, deliberation, and a framework that makes harm a losing strategy.
        </p>
      </section>

      {/* ── Origin — sage ────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.sage}`}>
        <div className={styles.num}>01</div>
        <div className={styles.sectionBody}>
          <h2 className={styles.heading}>The designer's dilemma</h2>
          <p className={styles.text}>
            I trained as an industrial designer. Every material choice has a cost.
            Every decision ripples through systems most people never see.
            What is the effect of this material? This mobility system? This policy?
          </p>
          <p className={styles.text}>
            Most decisions get made with one lens. Quorum was built to change that —
            to give anyone access to a full council of expert perspectives before
            the decision is locked in.
          </p>
        </div>
      </section>

      {/* ── Why — dark elevated ──────────────────────────────── */}
      <section className={`${styles.section} ${styles.elevated}`}>
        <div className={styles.num}>02</div>
        <div className={styles.sectionBody}>
          <h2 className={styles.heading}>The questions that matter have real answers</h2>
          <p className={styles.text}>
            How do we reduce food waste at scale? Make housing affordable?
            Cut emissions without abandoning communities?
            These questions have answers — if you know which angles to pressure-test them from.
          </p>
          <p className={styles.text}>
            Quorum lets you pick your council: expert voices that surface effects
            you hadn't considered, and push toward solutions that hold up
            across multiple dimensions of value at once.
          </p>
        </div>
      </section>

      {/* ── Thesis — chalk ───────────────────────────────────── */}
      <section className={`${styles.section} ${styles.chalk}`}>
        <div className={`${styles.num} ${styles.numDark}`}>03</div>
        <div className={styles.sectionBody}>
          <h2 className={`${styles.heading} ${styles.headingDark}`}>The design thesis</h2>
          <p className={`${styles.text} ${styles.textDark}`}>
            Thirteen personas. Each one trained on a distinct ideology.
            Each one competing to score the highest on the same surface —
            a framework that penalises deprivation and ecological overshoot equally.
            No agent can win by sacrificing one for the other.
          </p>
          <p className={`${styles.text} ${styles.textDark}`}>
            What emerges is convergence. Not because anyone agreed in advance,
            but because the system made it the only winning path.
          </p>
          <div className={styles.thesisBox}>
            Agents become beneficial not when constrained to avoid harm —
            but when designed to compete toward a framework that makes harm a losing strategy.
          </div>
        </div>
      </section>

      {/* ── Experiment — earth ───────────────────────────────── */}
      <section className={`${styles.section} ${styles.dark}`}>
        <div className={styles.num}>04</div>
        <div className={styles.sectionBody}>
          <h2 className={styles.heading}>An experiment in three parts</h2>
          <p className={styles.text}>
            A deliberation game. A use case for Dolt — a Git-native database
            where every agent decision is a commit and every deliberation is auditable forever.
            And a proof that agents can pursue genuinely good outcomes
            when the right framework is in play.
          </p>
          <div className={styles.techRow}>
            <div className={styles.techItem}>
              <div className={styles.techLabel}>ENGINE</div>
              <div className={styles.techValue}>Claude · 13 personas · 10 iterations</div>
            </div>
            <div className={styles.techItem}>
              <div className={styles.techLabel}>FRAMEWORK</div>
              <div className={styles.techValue}>Doughnut Economics · Raworth (2017)</div>
            </div>
            <div className={styles.techItem}>
              <div className={styles.techLabel}>SUBSTRATE</div>
              <div className={styles.techValue}>Dolt · Git-native versioned SQL</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — sage ───────────────────────────────────────── */}
      <section className={`${styles.cta} ${styles.sage}`}>
        <div className={`${styles.ctaText} ${styles.textDark}`}>Try posing a question.</div>
        <Link to="/" className={`${styles.ctaLink} ${styles.ctaLinkDark}`}>Open the platform →</Link>
        <Link to="/model" className={`${styles.ctaLinkSec} ${styles.ctaLinkSecDark}`}>Read the model →</Link>
      </section>

    </div>
  )
}
