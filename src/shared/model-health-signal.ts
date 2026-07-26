/**
 * Detect model / provider failures from gateway log lines for the Dashboard banner.
 */

export type ModelHealthSignal =
  | { kind: 'failover'; detail: string }
  | { kind: 'primary_down'; detail: string }
  | { kind: 'rate_limited'; detail: string }
  | null

const FAILOVER_RE =
  /\b(fallback|fail[\s-]?over|trying next model|switched to|using fallback)\b/i
const PRIMARY_DOWN_RE =
  /\b(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|model (?:request )?failed|provider error|404\b|502\b|503\b|no healthy upstream|connection refused)\b/i
const RATE_LIMIT_RE = /\b(rate[\s-]?limit|429\b|too many requests)\b/i

export function detectModelHealthSignal(message: string): ModelHealthSignal {
  const text = message.trim()
  if (!text) return null
  if (FAILOVER_RE.test(text)) {
    return { kind: 'failover', detail: text.slice(0, 240) }
  }
  if (RATE_LIMIT_RE.test(text)) {
    return { kind: 'rate_limited', detail: text.slice(0, 240) }
  }
  if (PRIMARY_DOWN_RE.test(text)) {
    return { kind: 'primary_down', detail: text.slice(0, 240) }
  }
  return null
}
