import { describe, it, expect } from 'vitest'
import { mapLeaderboardRow } from '../api/client.js'

describe('mapLeaderboardRow', () => {
  it('maps all snake_case fields to camelCase', () => {
    const row = {
      rank:            1,
      username:        'alice',
      best_score:      87.5,
      winning_persona: 'scientist',
      question:        'How do we fix it?',
      dataset:         'EPA-2024',
      created_at:      '2026-01-01T00:00:00Z',
      commit_hash:     'abc1234',
    }
    const mapped = mapLeaderboardRow(row)
    expect(mapped).toEqual({
      rank:           1,
      username:       'alice',
      bestScore:      87.5,
      winningPersona: 'scientist',
      question:       'How do we fix it?',
      dataset:        'EPA-2024',
      date:           '2026-01-01T00:00:00Z',
      commitHash:     'abc1234',
    })
  })

  it('all expected camelCase fields are present', () => {
    const row = {
      rank: 2, username: 'bob', best_score: 70, winning_persona: 'engineer',
      question: 'Q', dataset: 'DS', created_at: '2026-02-01', commit_hash: 'def5678',
    }
    const mapped = mapLeaderboardRow(row)
    expect(Object.keys(mapped)).toEqual(
      ['rank', 'username', 'bestScore', 'winningPersona', 'question', 'dataset', 'date', 'commitHash']
    )
  })

  it('handles null/undefined values gracefully', () => {
    const row = {
      rank: null, username: undefined, best_score: null, winning_persona: null,
      question: null, dataset: null, created_at: null, commit_hash: null,
    }
    const mapped = mapLeaderboardRow(row)
    expect(mapped.rank).toBeNull()
    expect(mapped.username).toBeUndefined()
    expect(mapped.bestScore).toBeNull()
    expect(mapped.winningPersona).toBeNull()
    expect(mapped.commitHash).toBeNull()
    expect(mapped.date).toBeNull()
  })
})
