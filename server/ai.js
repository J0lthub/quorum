import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Maps persona id → rich description for the prompt
const PERSONA_PROMPTS = {
  scientist:           'a rigorous research scientist who demands peer-reviewed evidence, proposes controlled experiments, and frames every intervention as a testable hypothesis',
  engineer:            'a pragmatic systems engineer who focuses on feasibility, cost, and infrastructure — you want solutions that can actually be built and maintained at scale',
  industrial_designer: 'a systems-thinking industrial designer who prioritizes user experience, elegant redesign of broken systems, and reducing friction through better product thinking',
  mathematician:       'a pure optimization mathematician who cuts through noise to find the most efficient path to measurable outcomes using data and formal models',
  journalist:          'an investigative journalist who follows the human story, surfaces who is being left out, and holds powerful interests accountable',
  commons_steward:     'a commons steward who asks "who owns this?" at every step, prioritizes collective governance, and defends shared resources from enclosure',
  regenerative_econ:   'a regenerative economist who thinks in circular systems — every waste stream is an input, every cost is also a design failure to be resolved',
  equity_analyst:      'a social equity analyst who scores every solution by how it affects the bottom 20% — solutions that help the well-off while ignoring the vulnerable are rejected',
  planetary_bounds:    'a planetary boundaries scientist who enforces hard ecological ceilings — you will reject any proposal that risks irreversible overshoot of Earth systems',
  care_economy:        'a care economy advocate who surfaces the invisible labor — childcare, eldercare, community maintenance — that GDP ignores and every policy should account for',
  urban_ecologist:     'an urban ecologist who finds where city systems meet living systems, promoting green infrastructure, biodiversity corridors, and habitat restoration',
  degrowth:            'a degrowth strategist and provocateur who asks whether the solution is less — less consumption, less throughput, less growth — rather than more of anything',
  indigenous:          'an indigenous knowledge holder who brings long-horizon, place-based wisdom, thinking in generations and asking what the land and community have always known',
}

/**
 * Ask Claude to generate one persona decision for a single tick.
 *
 * Returns { decision, reasoning, socialDelta, planetaryDelta }
 * Falls back to a small random walk if the API call fails.
 */
export async function generateDecision({ personaId, question, social, planetary, iteration, history }) {
  const personaDesc = PERSONA_PROMPTS[personaId] ?? personaId

  // Build a short history string (last 3 decisions) for continuity
  const historyText = history?.length
    ? `\nYour last decisions:\n${history.slice(-3).map((d, i) => `  ${i + 1}. ${d}`).join('\n')}`
    : ''

  const prompt = `You are ${personaDesc}.

The question being explored is: "${question}"

Current scores after ${iteration} rounds:
- Social score: ${social.toFixed(1)}/100 (measures human wellbeing, equity, community benefit)
- Planetary score: ${planetary.toFixed(1)}/100 (measures ecological health, sustainability, planetary safety)

${historyText}

Propose ONE specific, concrete action or policy intervention you would advocate for next — something that fits your worldview and addresses the question. Make it specific enough to be debatable (not generic like "invest in renewables" but something like "require all new buildings >500m² to install rooftop solar with mandatory grid feed-in by 2027").

Then estimate the realistic impact on scores: your proposed action may help one dimension more than the other, or have trade-offs.

Respond in this exact JSON format (no other text):
{
  "decision": "one concrete sentence describing what you propose",
  "reasoning": "one sentence explaining why this fits your perspective",
  "socialDelta": <number from -8 to +8>,
  "planetaryDelta": <number from -8 to +8>
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text ?? ''
    // Extract JSON — tolerate minor whitespace/markdown wrapping
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    // Claude sometimes emits +5 for positive numbers which is invalid JSON — strip the leading +
    const sanitized = jsonMatch[0].replace(/:\s*\+(\d)/g, ': $1')
    const parsed = JSON.parse(sanitized)

    return {
      decision:       String(parsed.decision   ?? '').slice(0, 500),
      reasoning:      String(parsed.reasoning  ?? '').slice(0, 500),
      socialDelta:    clampDelta(parsed.socialDelta),
      planetaryDelta: clampDelta(parsed.planetaryDelta),
    }
  } catch (err) {
    console.error(`AI decision failed for ${personaId}:`, err.message)
    // Fallback: small random walk so the game still progresses
    return {
      decision:       `${personaId} continues their analysis (AI unavailable)`,
      reasoning:      '',
      socialDelta:    (Math.random() * 4 - 2),
      planetaryDelta: (Math.random() * 4 - 2),
    }
  }
}

function clampDelta(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : Math.max(-8, Math.min(8, n))
}
