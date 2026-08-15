import { describe, expect, it, vi } from 'vitest'
import { queryBalance, type BalanceInfo } from '../src/index.ts'

const fetchMock = (body: unknown, ok = true): typeof fetch => (() =>
  Promise.resolve(new Response(ok ? JSON.stringify(body) : 'nope', { status: ok ? 200 : 401 }))) as typeof fetch

describe('queryBalance', () => {
  it('returns the balance rows from the DeepSeek endpoint', async () => {
    const fetchImpl = vi.fn(fetchMock({
      balance_infos: [{ currency: 'CNY', total_balance: '110.00', granted_balance: '10.00', topped_up_balance: '100.00' }],
    }))
    const rows = await queryBalance({ apiKey: 'sk-test', baseUrl: 'https://api.deepseek.com' }, fetchImpl)
    expect(rows).toEqual<BalanceInfo[]>([
      { currency: 'CNY', totalBalance: '110.00', grantedBalance: '10.00', toppedUpBalance: '100.00' },
    ])
    expect(fetchImpl).toHaveBeenCalledWith('https://api.deepseek.com/user/balance', {
      headers: { Authorization: 'Bearer sk-test' },
    })
  })

  it('returns undefined without an API key', async () => {
    const fetchImpl = vi.fn(fetchMock({}))
    expect(await queryBalance({ apiKey: undefined, baseUrl: 'https://api.deepseek.com' }, fetchImpl)).toBeUndefined()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns undefined on a non-2xx response', async () => {
    const fetchImpl = vi.fn(fetchMock({}, false))
    expect(await queryBalance({ apiKey: 'sk-test', baseUrl: 'https://api.deepseek.com' }, fetchImpl)).toBeUndefined()
  })

  it('returns undefined when the payload carries no balance_infos array', async () => {
    const fetchImpl = vi.fn(fetchMock({ balance_infos: 'not-an-array' }))
    expect(await queryBalance({ apiKey: 'sk-test', baseUrl: 'https://api.deepseek.com' }, fetchImpl)).toBeUndefined()
  })
})
