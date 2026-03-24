import { describe, it, expect } from 'vitest'
import { isInZone, computeHabitableScore } from './scoring'

describe('isInZone', () => {
  it('returns true when both scores are exactly 60', () => {
    expect(isInZone(60, 60)).toBe(true)
  })

  it('returns false when social is below 60', () => {
    expect(isInZone(59, 80)).toBe(false)
  })

  it('returns false when planetary is below 60', () => {
    expect(isInZone(80, 59)).toBe(false)
  })

  it('returns false when both scores are 0', () => {
    expect(isInZone(0, 0)).toBe(false)
  })

  it('returns true when both scores are 100', () => {
    expect(isInZone(100, 100)).toBe(true)
  })

  it('returns false when social is 60 but planetary is 59', () => {
    expect(isInZone(60, 59)).toBe(false)
  })

  it('returns false when planetary is 60 but social is 59', () => {
    expect(isInZone(59, 60)).toBe(false)
  })
})

describe('computeHabitableScore', () => {
  it('returns the average when both scores are exactly 60', () => {
    expect(computeHabitableScore(60, 60)).toBe(60)
  })

  it('returns null when one score is below 60', () => {
    expect(computeHabitableScore(59, 80)).toBeNull()
  })

  it('returns null when both scores are 0', () => {
    expect(computeHabitableScore(0, 0)).toBeNull()
  })

  it('returns the average when both scores are 100', () => {
    expect(computeHabitableScore(100, 100)).toBe(100)
  })

  it('returns null for out-of-zone scores', () => {
    expect(computeHabitableScore(40, 90)).toBeNull()
  })

  it('returns null when social is 60 but planetary is 59', () => {
    expect(computeHabitableScore(60, 59)).toBeNull()
  })

  it('returns null when planetary is 60 but social is 59', () => {
    expect(computeHabitableScore(59, 60)).toBeNull()
  })
})
