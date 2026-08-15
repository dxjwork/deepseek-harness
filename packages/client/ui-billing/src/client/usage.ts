import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'

/** Compact token count: 517 / 12.2K / 1.2M (one decimal under three digits). */
export function formatTokens(n: number): string {
  const scaled = (v: number): string =>
    v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)
  if (n < 1_000) return String(n)
  if (n < 1_000_000) return `${scaled(n / 1_000)}K`
  return `${scaled(n / 1_000_000)}M`
}

/** Sum the three disjoint prompt-side billing buckets. */
export function billedInputTokens(usage: TokenUsageProjection): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

/** The empty token-usage value used when no session has reported usage yet. */
const ZERO: TokenUsageProjection = {
  uncachedInputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
}

/**
 * Sum provider-reported token usage across every listed session.
 * @param byId - the session list index (ids → summaries with retained projections).
 * @returns the cumulative usage across all sessions.
 */
export function cumulativeUsage(byId: SessionListState['byId']): TokenUsageProjection {
  const total: TokenUsageProjection = { ...ZERO }
  for (const summary of Object.values(byId)) {
    const usage = summary.projectionValues?.tokenUsage
    if (usage === undefined) continue
    total.uncachedInputTokens += usage.uncachedInputTokens
    total.outputTokens += usage.outputTokens
    total.cacheReadTokens += usage.cacheReadTokens
    total.cacheWriteTokens += usage.cacheWriteTokens
  }
  return total
}
