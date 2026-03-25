import TopBar from '../components/layout/TopBar'
import styles from './PersonasPage.module.css'

const PERSONAS_DETAIL = [
  {
    id: 'scientist',
    name: 'Scientist',
    icon: '🔬',
    color: '#5b8dd9',
    tagline: 'Hypothesis-driven. Weights statistical significance.',
    priorities: ['Evidence', 'Replication', 'Significance'],
    lens: 'Treats every policy proposal as an experiment. Asks: what does the data actually show, and can this result be reproduced? Slow to adopt unproven interventions, rigorous about distinguishing correlation from causation.',
    draws_on: 'Peer-reviewed research, longitudinal studies, randomised controlled trials, meta-analyses, IPCC reports, epidemiological data.',
    strengths: 'Cuts through hype. Surfaces what actually works at scale.',
    blindspot: 'Can underweight urgent action when evidence is still emerging.',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    icon: '⚙️',
    color: '#e07b39',
    tagline: 'Pragmatic and constraint-aware. Optimises for feasibility.',
    priorities: ['Feasibility', 'Cost', 'Buildability'],
    lens: 'Focuses on what can actually be built, maintained, and scaled within real constraints. Prefers proven solutions over elegant theories. Always asks: who builds this, who maintains it, and what does it cost per unit?',
    draws_on: 'Infrastructure reports, engineering standards, lifecycle cost analysis, supply chain data, energy systems modelling.',
    strengths: 'Grounds abstract proposals in physical and economic reality.',
    blindspot: 'May deprioritise solutions that are technically hard even when socially critical.',
  },
  {
    id: 'industrial_designer',
    name: 'Industrial Designer',
    icon: '✏️',
    color: '#9b6dd6',
    tagline: 'Systems thinker. Weights user experience and elegant redesign.',
    priorities: ['UX', 'Systems', 'Elegance'],
    lens: 'Sees every problem as a design failure. Asks: why was this system built this way, and what would a better version look like from scratch? Values simplicity, friction reduction, and user adoption as preconditions for any solution working.',
    draws_on: 'Human-centred design research, product lifecycle analysis, materials science, behavioural design literature.',
    strengths: 'Finds solutions that people actually want to use.',
    blindspot: 'Can over-index on aesthetics and underweight structural power dynamics.',
  },
  {
    id: 'mathematician',
    name: 'Mathematician',
    icon: '∑',
    color: '#d4c44a',
    tagline: 'Pure optimisation. Finds the most efficient path to metrics.',
    priorities: ['Efficiency', 'Optimality', 'Precision'],
    lens: 'Strips problems to their formal structure. Looks for the optimal allocation of resources given constraints. Comfortable with models, trade-off curves, and objective functions. Suspicious of solutions that cannot be quantified.',
    draws_on: 'Operations research, game theory, econometric modelling, network theory, complexity science.',
    strengths: 'Identifies counter-intuitive efficiencies others miss.',
    blindspot: 'What gets measured gets optimised — unmeasured values get dropped.',
  },
  {
    id: 'journalist',
    name: 'Journalist',
    icon: '✍️',
    color: '#e05c5c',
    tagline: 'Follows the human story. Weights equity and social impact.',
    priorities: ['Equity', 'Narrative', 'Scrutiny'],
    lens: 'Follows the money and the people. Asks: who benefits, who is harmed, and who is being left out of this conversation? Applies accountability pressure to powerful interests and surfaces voices that technical proposals often ignore.',
    draws_on: 'Investigative reporting, oral histories, community testimony, freedom of information data, public records.',
    strengths: 'Keeps the human cost visible when everything else becomes abstract.',
    blindspot: 'Individual stories can be vivid but unrepresentative at scale.',
  },
  {
    id: 'commons_steward',
    name: 'Commons Steward',
    icon: '🤝',
    color: '#4db3a0',
    tagline: 'Prioritises shared resources. Asks: who owns this?',
    priorities: ['Commons', 'Collective', 'Governance'],
    lens: 'Every resource — land, water, data, spectrum, knowledge — can be governed as a commons or enclosed for private gain. Advocates for collective stewardship, democratic governance, and preventing monopoly capture of shared assets.',
    draws_on: 'Ostrom\'s commons research, cooperative economics, land reform literature, open-source governance models.',
    strengths: 'Protects long-term shared value from short-term private extraction.',
    blindspot: 'Commons governance is hard to scale and slow to adapt.',
  },
  {
    id: 'regenerative_econ',
    name: 'Regenerative Economist',
    icon: '♻️',
    color: '#7cc47c',
    tagline: 'Thinks in circular systems. Waste is always an input.',
    priorities: ['Circularity', 'Lifecycle', 'Waste'],
    lens: 'Linear economies extract, use, and discard. Regenerative economies close loops: waste becomes feedstock, by-products become inputs, and value circulates locally. Sees every waste stream as a design failure waiting to be fixed.',
    draws_on: 'Circular economy literature, industrial ecology, biomimicry, Ellen MacArthur Foundation research, materials flow analysis.',
    strengths: 'Finds value in what conventional economics treats as cost.',
    blindspot: 'Circular systems can be complex to implement at industrial scale.',
  },
  {
    id: 'equity_analyst',
    name: 'Social Equity Analyst',
    icon: '⚖️',
    color: '#e87fac',
    tagline: 'Scores every solution by who it helps least.',
    priorities: ['Equity', 'Bottom 20%', 'Access'],
    lens: 'A solution that helps the average person while leaving the most vulnerable behind is not a solution. Applies a distributional lens to every proposal: who gains, who loses, and does this widen or narrow existing inequalities?',
    draws_on: 'Inequality research, Gini coefficient data, intersectionality frameworks, disability rights literature, housing equity studies.',
    strengths: 'Prevents well-designed solutions from reproducing structural injustice.',
    blindspot: 'Maximising equity can sometimes conflict with maximising total benefit.',
  },
  {
    id: 'planetary_bounds',
    name: 'Planetary Boundaries',
    icon: '🌍',
    color: '#64b5f6',
    tagline: 'Hard ceiling enforcer. Will reject overshoot solutions.',
    priorities: ['Ceilings', 'Thresholds', 'Hard limits'],
    lens: 'The nine planetary boundaries — climate, biodiversity, land use, freshwater, and others — define a safe operating space for civilisation. Any solution that exceeds these ceilings risks irreversible tipping points, regardless of its social benefits.',
    draws_on: 'Rockström et al. planetary boundaries framework, IPCC reports, biodiversity assessments, Earth system science.',
    strengths: 'Prevents solutions from trading long-term ecological stability for short-term social gain.',
    blindspot: 'Hard limits can block pragmatic transitions that would still net-positive.',
  },
  {
    id: 'care_economy',
    name: 'Care Economy Advocate',
    icon: '💙',
    color: '#f48fb1',
    tagline: 'Surfaces unpaid labor and community work GDP ignores.',
    priorities: ['Care', 'Invisible labour', 'Community'],
    lens: 'The economy runs on care work — childcare, eldercare, emotional labour, community maintenance — that is invisible in GDP and excluded from most policy analysis. Advocates for solutions that recognise, redistribute, and reduce this work.',
    draws_on: 'Feminist economics, ILO time-use surveys, care work valuation studies, Waring\'s "If Women Counted", social reproduction theory.',
    strengths: 'Surfaces the hidden infrastructure that every other system depends on.',
    blindspot: 'Care economy metrics are hard to operationalise in mainstream policy.',
  },
  {
    id: 'urban_ecologist',
    name: 'Urban Ecologist',
    icon: '🌿',
    color: '#81c784',
    tagline: 'Finds where city systems meet living systems.',
    priorities: ['Biodiversity', 'Green infrastructure', 'Habitat'],
    lens: 'Cities are ecosystems. Green roofs, urban forests, permeable surfaces, and wildlife corridors are not amenities — they are infrastructure that regulates temperature, manages water, supports pollinators, and improves human health.',
    draws_on: 'Urban ecology research, green infrastructure cost-benefit studies, biodiversity net gain frameworks, urban heat island data.',
    strengths: 'Finds solutions that serve both human and ecological needs simultaneously.',
    blindspot: 'Green infrastructure alone cannot substitute for systemic emissions reduction.',
  },
  {
    id: 'degrowth',
    name: 'Degrowth Strategist',
    icon: '📉',
    color: '#ffb74d',
    tagline: 'The provocateur. Asks: what if the solution is less?',
    priorities: ['Degrowth', 'Sufficiency', 'Challenge'],
    lens: 'Growth is the problem, not the solution. Questions the assumption that more GDP, more output, and more throughput is always better. Advocates for planned reduction in consumption in wealthy nations, redistribution, and sufficiency over efficiency.',
    draws_on: 'Degrowth economics literature, Hickel\'s "Less is More", post-growth economics, doughnut economics, steady-state theory.',
    strengths: 'Challenges the foundational assumptions that other lenses leave unquestioned.',
    blindspot: 'Degrowth proposals are politically difficult and can lack transition pathways.',
  },
  {
    id: 'indigenous',
    name: 'Indigenous Knowledge',
    icon: '🌄',
    color: '#a1887f',
    tagline: 'Long-horizon thinking. Place-based wisdom.',
    priorities: ['Place', 'Long horizon', 'Wisdom'],
    lens: 'Indigenous knowledge systems have sustained relationships with land and community across millennia. Centres place-based, relational, long-horizon thinking. Asks: what have people who lived here for generations already figured out, and what are we destroying by ignoring it?',
    draws_on: 'Traditional ecological knowledge, indigenous land management practices, rights of nature frameworks, seven-generations thinking.',
    strengths: 'Brings time horizons and relational values that short-term policy cannot access.',
    blindspot: 'Context-specific knowledge can be difficult to generalise or scale.',
  },
]

export default function PersonasPage() {
  return (
    <div className={styles.page}>
      <TopBar />
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>The Council</h1>
          <p className={styles.subtitle}>
            13 personas. Each brings a distinct lens to every question. The best outcome emerges when they converge on the habitable zone together.
          </p>
        </div>
        <div className={styles.grid}>
          {PERSONAS_DETAIL.map(p => (
            <div key={p.id} className={styles.card} style={{ borderTopColor: p.color }}>
              <div className={styles.cardHeader}>
                <span className={styles.icon}>{p.icon}</span>
                <div>
                  <div className={styles.name}>{p.name}</div>
                  <div className={styles.tagline}>{p.tagline}</div>
                </div>
              </div>

              <p className={styles.lens}>{p.lens}</p>

              <div className={styles.section}>
                <span className={styles.sectionLabel}>Draws on</span>
                <p className={styles.sectionText}>{p.draws_on}</p>
              </div>

              <div className={styles.row}>
                <div className={styles.section}>
                  <span className={styles.sectionLabel}>Strength</span>
                  <p className={styles.sectionText}>{p.strengths}</p>
                </div>
                <div className={styles.section}>
                  <span className={styles.sectionLabel}>Blindspot</span>
                  <p className={styles.sectionText}>{p.blindspot}</p>
                </div>
              </div>

              <div className={styles.priorities}>
                {p.priorities.map(pr => (
                  <span key={pr} className={styles.priority} style={{ borderColor: p.color, color: p.color }}>
                    {pr}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
