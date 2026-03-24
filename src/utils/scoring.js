export const ZONE_THRESHOLD = 60
export const BORDERLINE_THRESHOLD = 50

// Returns true if agent is inside the habitable zone
export function isInZone(social, planetary) { return social >= ZONE_THRESHOLD && planetary >= ZONE_THRESHOLD }

// Returns (social + planetary) / 2 if both >= ZONE_THRESHOLD, otherwise null (outside zone)
export function computeHabitableScore(social, planetary) {
  if (social < ZONE_THRESHOLD || planetary < ZONE_THRESHOLD) return null
  return (social + planetary) / 2
}
