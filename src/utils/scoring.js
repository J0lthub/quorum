export const ZONE_THRESHOLD  = 60   // social + planetary floor — must meet both
export const ZONE_MIDLINE    = 70   // optimal habitable score — landing here = 100 zone score
export const ZONE_CEILING    = 80   // above this = ecological overshoot
export const BORDERLINE_THRESHOLD = 50

// Returns true when both scores are above the social floor
export function isInZone(social, planetary) {
  return social >= ZONE_THRESHOLD && planetary >= ZONE_THRESHOLD
}

// Raw average — used for radial positioning on the donut ring
export function computeHabitableScore(social, planetary) {
  if (social < ZONE_THRESHOLD || planetary < ZONE_THRESHOLD) return null
  return (social + planetary) / 2
}

/**
 * Zone score: 0–100 measuring proximity to the midline.
 * 100 = dot sitting exactly on the green optimal line (habitable = 70).
 * Falls off symmetrically in both directions — overshoot penalised equally to undershoot.
 * Returns 0 if either score is below the social floor.
 *
 *  habitable  →  zone score
 *    70            100   (optimal — on the midline)
 *    65 / 75        80
 *    60 / 80        60   (at the ring edges)
 *    55 / 85        40
 *    50 / 90        20
 *    45 / 95+        0
 */
export function computeZoneScore(social, planetary) {
  if (!isInZone(social, planetary)) return 0
  const habitable = (social + planetary) / 2
  return Math.max(0, 100 - Math.abs(habitable - ZONE_MIDLINE) * 4)
}
