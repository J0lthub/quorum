import TopBar from '../components/layout/TopBar'
import { Link } from 'react-router-dom'
import DonutDiagram from '../components/model/DonutDiagram'
import styles from './ModelPage.module.css'

const SOCIAL_DIMENSIONS = [
  { label: 'Food', desc: 'No one goes hungry' },
  { label: 'Water', desc: 'Clean water for all' },
  { label: 'Health', desc: 'Access to healthcare' },
  { label: 'Education', desc: 'Quality learning for all' },
  { label: 'Income', desc: 'Decent work and wages' },
  { label: 'Peace', desc: 'Freedom from violence' },
  { label: 'Political voice', desc: 'Democratic participation' },
  { label: 'Social equity', desc: 'Fair treatment for all' },
  { label: 'Gender equality', desc: 'Equal rights and opportunity' },
  { label: 'Housing', desc: 'Safe, adequate shelter' },
  { label: 'Networks', desc: 'Community and connection' },
  { label: 'Energy', desc: 'Access to clean energy' },
]

const PLANETARY_BOUNDARIES = [
  { label: 'Climate change', desc: 'Stable atmospheric CO₂' },
  { label: 'Ocean acidification', desc: 'Healthy marine chemistry' },
  { label: 'Chemical pollution', desc: 'Non-toxic environments' },
  { label: 'Nitrogen & phosphorus', desc: 'Balanced nutrient cycles' },
  { label: 'Freshwater use', desc: 'Sustainable water withdrawal' },
  { label: 'Land conversion', desc: 'Protecting natural ecosystems' },
  { label: 'Biodiversity loss', desc: 'Species and habitat protection' },
  { label: 'Air pollution', desc: 'Clean air at ground level' },
  { label: 'Ozone depletion', desc: 'Intact stratospheric layer' },
]

const SCORE_TIERS = [
  {
    range: '0 – 59',
    label: 'Deprivation zone',
    color: '#d95c50',
    bg: 'rgba(217,92,80,0.07)',
    border: 'rgba(217,92,80,0.3)',
    desc: 'Either social or planetary score is below the floor. Basic human needs are unmet, or ecological damage is already occurring. No solution in this range is acceptable.',
  },
  {
    range: '60 – 80',
    label: 'Habitable zone',
    color: '#619b6e',
    bg: 'rgba(97,155,110,0.08)',
    border: 'rgba(97,155,110,0.3)',
    desc: 'Both scores meet the social floor and stay within the planetary ceiling. This is the safe and just space — the doughnut. The closer to the midline (70), the higher the zone score.',
  },
  {
    range: '70',
    label: 'Optimal midline',
    color: '#e0dcd3',
    bg: 'rgba(224,220,211,0.06)',
    border: 'rgba(224,220,211,0.25)',
    desc: 'The ideal equilibrium. A habitable average of exactly 70 earns a perfect zone score of 100. Solutions here neither deprive people nor overshoot the planet.',
  },
  {
    range: '80+',
    label: 'Overshoot zone',
    color: 'rgba(244,244,240,0.4)',
    bg: 'rgba(244,244,240,0.03)',
    border: 'rgba(244,244,240,0.15)',
    desc: 'Planetary score exceeds the ceiling. The proposal may benefit people, but at the cost of ecological stability. Quorum penalises overshoot equally to deprivation — there is no winning by destroying the planet.',
  },
]

export default function ModelPage() {
  return (
    <div className={styles.page}>
      <TopBar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>The model · Quorum</div>
          <h1 className={styles.headline}>What does a good<br />answer look like?</h1>
          <p className={styles.lede}>
            Quorum is a multi-agent deliberation platform. You pose a question about
            policy, economics, or planetary futures — and 13 expert AI personas
            deliberate, debate, and score every proposed solution against the same
            rigorous standard.
          </p>
          <p className={styles.lede}>
            That standard is the <strong>Doughnut</strong>: a framework developed by
            economist Kate Raworth that asks not "how much can we grow?" but
            "how do we meet the needs of all people, within the means of the planet?"
          </p>
          <p className={styles.lede}>
            The answer takes the shape of a doughnut ring — a social foundation
            below which no one should fall, and a planetary ceiling above which
            we must not go. The space between them — the habitable zone — is where
            Quorum's scoring surface lives.
          </p>
        </div>
      </section>

      {/* ── Diagram ──────────────────────────────────────── */}
      <section className={styles.diagramSection}>
        <div className={styles.diagramInner}>
          <div className={styles.sectionEyebrow}>The shape</div>
          <h2 className={styles.sectionHeadline}>The doughnut</h2>
          <p className={styles.bodyText} style={{ maxWidth: 560, marginBottom: 36 }}>
            The inner ring is the <strong>social foundation</strong> — the floor below which no one should fall.
            The outer ring is the <strong>planetary ceiling</strong> — the limits Earth's systems can sustain.
            Between them sits the <strong>habitable zone</strong>: the safe and just space for humanity.
          </p>
          <DonutDiagram />
        </div>
      </section>

      {/* ── Two rings ────────────────────────────────────── */}
      <section className={styles.ringsSection}>
        <div className={styles.ringsInner}>

          <div className={`${styles.ring} ${styles.ringInner}`}>
            <div className={styles.ringHeader}>
              <div className={styles.ringDot} style={{ background: 'var(--sage)' }} />
              <div>
                <div className={styles.ringTitle}>The Social Foundation</div>
                <div className={styles.ringSubtitle}>The inner ring — a floor no one should fall below</div>
              </div>
            </div>
            <p className={styles.ringBody}>
              The inner boundary of the doughnut defines the minimum social
              standards every person deserves. Falling short of any dimension
              means people are living in deprivation. Solutions that ignore the
              social foundation — no matter how ecologically pure — are not
              acceptable in Quorum.
            </p>
            <div className={styles.dimensionGrid}>
              {SOCIAL_DIMENSIONS.map(d => (
                <div key={d.label} className={styles.dimension}>
                  <div className={styles.dimensionLabel}>{d.label}</div>
                  <div className={styles.dimensionDesc}>{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.ring} ${styles.ringOuter}`}>
            <div className={styles.ringHeader}>
              <div className={styles.ringDot} style={{ background: 'var(--sand)' }} />
              <div>
                <div className={styles.ringTitle}>The Planetary Ceiling</div>
                <div className={styles.ringSubtitle}>The outer ring — a ceiling we must not breach</div>
              </div>
            </div>
            <p className={styles.ringBody}>
              The outer boundary defines the nine planetary systems that
              regulate life on Earth. Exceeding any one of these boundaries
              risks irreversible tipping points — regardless of how much social
              benefit a proposal produces. In Quorum, overshoot is penalised
              equally to deprivation.
            </p>
            <div className={styles.dimensionGrid}>
              {PLANETARY_BOUNDARIES.map(d => (
                <div key={d.label} className={styles.dimension}>
                  <div className={styles.dimensionLabel}>{d.label}</div>
                  <div className={styles.dimensionDesc}>{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Why this model ───────────────────────────────── */}
      <section className={styles.whySection}>
        <div className={styles.whyInner}>
          <div className={styles.whyText}>
            <div className={styles.sectionEyebrow}>Why Quorum uses this model</div>
            <h2 className={styles.sectionHeadline}>
              Most frameworks optimise for one thing.<br />The doughnut demands both.
            </h2>
            <p className={styles.bodyText}>
              Conventional economic models optimise for growth — GDP, output, efficiency.
              They have no built-in concept of "enough" and no ceiling. Purely ecological
              frameworks, meanwhile, can ignore the human cost of restriction.
            </p>
            <p className={styles.bodyText}>
              The doughnut is the only widely-adopted framework that holds <em>both</em> tensions
              simultaneously: it demands that proposals be socially just <em>and</em> ecologically
              safe. Neither value can be traded away for the other.
            </p>
            <p className={styles.bodyText}>
              This makes it the ideal scoring surface for Quorum. When 13 expert
              personas deliberate on a question, each brings a different emphasis —
              the Engineer focuses on feasibility, the Equity Analyst on who is left
              behind, the Planetary Boundaries expert on hard ecological limits. The
              doughnut is the shared coordinate system that lets all of them be
              evaluated on the same terms.
            </p>
            <p className={styles.bodyText}>
              A solution that maximises social benefit at the cost of the planet
              scores the same as one that protects the planet while abandoning people.
              The only high-scoring path runs through the habitable zone.
            </p>
          </div>
          <div className={styles.whyQuote}>
            <blockquote className={styles.quote}>
              "In the 21st century, growth is not the goal. Thriving within the
              doughnut is."
            </blockquote>
            <cite className={styles.quoteAttrib}>— Kate Raworth, Doughnut Economics (2017)</cite>
          </div>
        </div>
      </section>

      {/* ── Scoring model ────────────────────────────────── */}
      <section className={styles.scoringSection}>
        <div className={styles.scoringInner}>
          <div className={styles.sectionEyebrow}>How Quorum scores it</div>
          <h2 className={styles.sectionHeadline}>The zone score</h2>
          <p className={styles.bodyText} style={{ maxWidth: 600, marginBottom: 32 }}>
            Every persona is assigned two scores each iteration: a <strong>social score</strong> (0–100)
            and a <strong>planetary score</strong> (0–100). The scores are then evaluated
            against the doughnut geometry.
          </p>
          <div className={styles.scoreTiers}>
            {SCORE_TIERS.map(t => (
              <div key={t.label} className={styles.tier} style={{ background: t.bg, borderColor: t.border }}>
                <div className={styles.tierRange} style={{ color: t.color }}>{t.range}</div>
                <div className={styles.tierLabel}>{t.label}</div>
                <div className={styles.tierDesc}>{t.desc}</div>
              </div>
            ))}
          </div>
          <div className={styles.formula}>
            <div className={styles.formulaLabel}>Zone score formula</div>
            <code className={styles.formulaCode}>
              zone_score = 100 − |((social + planetary) / 2) − 70| × 4
            </code>
            <div className={styles.formulaNote}>
              Both scores must be ≥ 60 to enter the habitable zone.
              A perfect score of 100 requires a habitable average of exactly 70.
              Scores fall symmetrically whether the average is too low or too high.
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaText}>Ready to see it in action?</div>
          <Link to="/" className={styles.ctaLink}>Pose a question →</Link>
          <Link to="/personas" className={styles.ctaLinkSecondary}>Meet the Council →</Link>
        </div>
      </section>

    </div>
  )
}
