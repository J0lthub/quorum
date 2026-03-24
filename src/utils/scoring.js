// Returns true if agent is inside the habitable zone
export function isInZone(social, planetary) { return social >= 60 && planetary >= 60 }

// Returns (social + planetary) / 2 if both >= 60, otherwise null (outside zone)
export function computeHabitableScore(social, planetary) {
  if (social < 60 || planetary < 60) return null
  return (social + planetary) / 2
}
