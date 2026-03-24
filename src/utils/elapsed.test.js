import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { elapsed } from './elapsed'

const NOW = new Date('2026-01-01T12:00:00Z')

describe('elapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for null input', () => {
    expect(elapsed(null)).toBe('')
  })

  it('returns empty string for undefined input', () => {
    expect(elapsed(undefined)).toBe('')
  })

  it('returns "0s" for negative diff', () => {
    // a startedAt in the future
    const future = new Date(NOW.getTime() + 10000).toISOString()
    expect(elapsed(future)).toBe('0s')
  })

  it('returns seconds only for < 1 minute', () => {
    const start = new Date(NOW.getTime() - 45 * 1000).toISOString()
    expect(elapsed(start)).toBe('45s')
  })

  it('returns minutes + seconds for < 1 hour', () => {
    const start = new Date(NOW.getTime() - (3 * 60 + 20) * 1000).toISOString()
    expect(elapsed(start)).toBe('3m 20s')
  })

  it('returns hours + minutes + seconds for < 1 day', () => {
    const start = new Date(NOW.getTime() - (2 * 3600 + 15 * 60 + 10) * 1000).toISOString()
    expect(elapsed(start)).toBe('2h 15m 10s')
  })

  it('returns days + hours for >= 1 day', () => {
    const start = new Date(NOW.getTime() - (2 * 86400 + 3 * 3600) * 1000).toISOString()
    expect(elapsed(start)).toBe('2d 3h')
  })
})
