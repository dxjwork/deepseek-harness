import { describe, expect, it } from 'vitest'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { billedInputTokens, cumulativeUsage, formatTokens } from '../src/client/usage.ts'

const usage = (n: number) => ({
  uncachedInputTokens: n,
  outputTokens: n * 2,
  cacheReadTokens: n,
  cacheWriteTokens: 0,
})

describe('formatTokens', () => {
  it('compacts token counts', () => {
    expect(formatTokens(517)).toBe('517')
    expect(formatTokens(12_200)).toBe('12.2K')
    expect(formatTokens(1_200_000)).toBe('1.2M')
  })
})

describe('billedInputTokens', () => {
  it('sums the three prompt-side buckets', () => {
    expect(billedInputTokens({ uncachedInputTokens: 5, outputTokens: 0, cacheReadTokens: 3, cacheWriteTokens: 2 })).toBe(10)
  })
})

describe('cumulativeUsage', () => {
  it('sums token usage across every listed session, skipping sessions without a projection', () => {
    const byId: SessionListState['byId'] = {
      a: { id: 'a' as never, projectionValues: { tokenUsage: usage(1) } },
      b: { id: 'b' as never, projectionValues: { tokenUsage: usage(2) } },
      c: { id: 'c' as never },
    } as SessionListState['byId']
    expect(cumulativeUsage(byId)).toEqual({
      uncachedInputTokens: 3,
      outputTokens: 6,
      cacheReadTokens: 3,
      cacheWriteTokens: 0,
    })
  })
})
