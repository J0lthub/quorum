import { Router }  from 'express'
import Anthropic    from '@anthropic-ai/sdk'
import { pool }     from '../db.js'

const router  = Router()
const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Full persona descriptions for the analyst prompt
const PERSONA_DESCRIPTIONS = {
  scientist:           'Scientist — rigorous, evidence-driven, demands peer-reviewed proof',
  engineer:            'Engineer — pragmatic, cost-aware, focused on what can actually be built',
  industrial_designer: 'Industrial Designer — systems thinker, weights UX and elegant redesign',
  mathematician:       'Mathematician — pure optimiser, finds the most efficient measurable path',
  journalist:          'Journalist — follows the human story, surfaces who is left out',
  commons_steward:     'Commons Steward — asks "who owns this?", defends collective governance',
  regenerative_econ:   'Regenerative Economist — thinks in circular systems, waste = design failure',
  equity_analyst:      'Social Equity Analyst — scores every solution by how it affects the worst-off',
  planetary_bounds:    'Planetary Boundaries — hard ceiling enforcer, will reject any overshoot',
  care_economy:        'Care Economy Advocate — surfaces the invisible labour GDP ignores',
  urban_ecologist:     'Urban Ecologist — finds where city systems meet living systems',
  degrowth:            'Degrowth Strategist — the provocateur, asks if the solution is less',
  indigenous:          'Indigenous Knowledge — long-horizon, place-based, multi-generational wisdom',
}

// GET /api/games/:id/insight  — streams a Claude narrative analysis
router.get('/:id/insight', async (req, res) => {
  const { id: gameId } = req.params

  try {
    // ── 1. Fetch game row ────────────────────────────────────────────────────
    const [[game]] = await pool.execute(
      'SELECT id, question, status FROM games WHERE id = ?', [gameId]
    )
    if (!game) return res.status(404).json({ error: 'Game not found' })

    // ── 2. Fetch agents ──────────────────────────────────────────────────────
    const [agents] = await pool.execute(
      'SELECT id, persona_id FROM agents WHERE game_id = ?', [gameId]
    )

    // ── 3. Fetch full score history per agent ────────────────────────────────
    const [scoreRows] = await pool.execute(
      `SELECT agent_id, iteration, social_score, planetary_score, decision, reasoning
       FROM agent_scores
       WHERE game_id = ?
       ORDER BY agent_id, iteration ASC`,
      [gameId]
    )

    // Group history by agent
    const historyByAgent = {}
    for (const row of scoreRows) {
      if (!historyByAgent[row.agent_id]) historyByAgent[row.agent_id] = []
      historyByAgent[row.agent_id].push(row)
    }

    // ── 4. Build the analyst prompt ──────────────────────────────────────────
    const councilLines = agents.map(a => {
      const desc = PERSONA_DESCRIPTIONS[a.persona_id] ?? a.persona_id
      return `  • ${desc}`
    }).join('\n')

    const trajectoryLines = agents.map(a => {
      const history = historyByAgent[a.id] ?? []
      const name = (PERSONA_DESCRIPTIONS[a.persona_id] ?? a.persona_id).split(' — ')[0]
      const points = history
        .filter((_, i) => i === 0 || i === Math.floor(history.length / 2) || i === history.length - 1)
        .map(h => `iter ${h.iteration}: S${h.social_score?.toFixed(1)}/P${h.planetary_score?.toFixed(1)}`)
        .join(' → ')
      return `  ${name.padEnd(24)} ${points}`
    }).join('\n')

    const finalPositions = agents.map(a => {
      const history = historyByAgent[a.id] ?? []
      const last    = [...history].reverse().find(h => h.decision)
      const name = (PERSONA_DESCRIPTIONS[a.persona_id] ?? a.persona_id).split(' — ')[0]
      if (!last) return `  ${name}: (no decision recorded)`
      return `  ${name}:\n    Decision: ${last.decision}\n    Reasoning: ${last.reasoning ?? '—'}`
    }).join('\n\n')

    const finalScores = agents.map(a => {
      const history = historyByAgent[a.id] ?? []
      const last    = history.at(-1)
      const name = (PERSONA_DESCRIPTIONS[a.persona_id] ?? a.persona_id).split(' — ')[0]
      if (!last) return `  ${name}: no data`
      const hab = ((last.social_score + last.planetary_score) / 2).toFixed(1)
      const inZone = last.social_score >= 60 && last.planetary_score >= 60
      return `  ${name.padEnd(24)} Social: ${last.social_score?.toFixed(1).padStart(5)}  Planetary: ${last.planetary_score?.toFixed(1).padStart(5)}  Habitable: ${hab.padStart(5)}  ${inZone ? '✓ ZONE' : '✗ OUTSIDE'}`
    }).join('\n')

    const prompt = `You are a senior policy analyst writing a post-deliberation briefing. \
A Quorum council of AI personas just completed 10 rounds of deliberation using the Doughnut Economics framework \
(social floor 60, planetary ceiling 80, optimal midline 70). \
Scores above 80 mean overshoot. Below 60 means deprivation. The habitable zone is 60–80 on both axes.

QUESTION POSED TO THE COUNCIL:
"${game.question}"

THE COUNCIL (${agents.length} personas):
${councilLines}

SCORE TRAJECTORIES (start → mid → final, Social/Planetary):
${trajectoryLines}

FINAL POSITIONS — each persona's last decision and reasoning:
${finalPositions}

FINAL SCORES:
${finalScores}

---

Write a short briefing — 150 words maximum. Use plain, clear English that a 10th grader can understand. No jargon, no academic language, no bullet points, no headers, no markdown. Write in short sentences.

Cover these four things in order:
1. Did the experts agree quickly, or did they go back and forth before settling?
2. What specific ideas came up independently across 3 or more personas? Call these out clearly as consensus — something like "Three experts independently landed on X."
3. Where was the biggest disagreement or tradeoff? Name the persona and explain it simply.
4. One plain sentence: what is the bottom line for someone who has to make a decision?

Use the persona names. Be specific about what they actually said. Skip anything vague.`

    // ── 5. Stream the response ───────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering if proxied

    const stream = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 300,
      stream:     true,
      messages:   [{ role: 'user', content: prompt }],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(event.delta.text)
      }
    }

    res.end()
  } catch (err) {
    console.error('Insight route error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate insight' })
    } else {
      res.end()
    }
  }
})

export default router
