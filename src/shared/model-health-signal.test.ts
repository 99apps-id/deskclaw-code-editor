import { describe, expect, it } from 'vitest'
import { detectModelHealthSignal } from './model-health-signal.js'

describe('detectModelHealthSignal', () => {
  it('detects failover language', () => {
    expect(detectModelHealthSignal('trying next model in fallback chain')?.kind).toBe('failover')
  })

  it('detects primary down', () => {
    expect(detectModelHealthSignal('fetch failed: ECONNREFUSED 127.0.0.1:20129')?.kind).toBe(
      'primary_down',
    )
  })

  it('detects rate limits', () => {
    expect(detectModelHealthSignal('HTTP 429 too many requests')?.kind).toBe('rate_limited')
  })

  it('ignores unrelated lines', () => {
    expect(detectModelHealthSignal('gateway listening on 18789')).toBeNull()
  })
})
