/**
 * DeepSeek account-balance capability: one host service that resolves the
 * provider's API key and base URL, queries `GET {base}/user/balance`, and
 * returns the balance rows (or `undefined` when the endpoint is unreachable,
 * the key is missing, or the composition points at a gateway without the
 * balance route). A short cache keeps a GUI polling from hammering the
 * endpoint; the value is a display reference, not a billing or gating input.
 * @module @deepseek-ai/dsh-billing
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'

/** Public DeepSeek API base, used when no trusted environment overrides it. */
const PUBLIC_BASE_URL = 'https://api.deepseek.com'

/** Environment variable naming the API key, shared with the llm-deepseek route. */
const API_KEY_ENV = 'DEEPSEEK_API_KEY'

/** Environment variable naming the endpoint override, honored from the trusted snapshot. */
const BASE_URL_ENV = 'DEEPSEEK_BASE_URL'

/** How long one successful balance answer is reused before the next poll re-queries. */
const CACHE_TTL_MS = 60_000

/** One currency row of the balance endpoint's `balance_infos` array. */
export interface BalanceInfo {
  /** ISO currency code (e.g. `CNY`). */
  currency: string
  /** Total available balance as the provider's decimal string. */
  totalBalance: string
  /** Granted (promotional) balance as the provider's decimal string. */
  grantedBalance: string
  /** Topped-up balance as the provider's decimal string. */
  toppedUpBalance: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    billing: Billing
  }
}

/**
 * One best-effort balance fetch against the DeepSeek balance route; every
 * failure folds to `undefined` (unavailable). Pure over an injected fetch so
 * the wire can be unit-tested without a Cordis context.
 * @param resolve - resolved API key and endpoint base.
 * @param fetchImpl - the fetch implementation (defaults to the global).
 * @returns the balance rows, or `undefined` when the key or endpoint is unusable.
 */
export async function queryBalance(
  resolve: { apiKey: string | undefined; baseUrl: string },
  fetchImpl: typeof fetch = fetch,
): Promise<BalanceInfo[] | undefined> {
  if (resolve.apiKey === undefined) return undefined
  try {
    const response = await fetchImpl(`${resolve.baseUrl}/user/balance`, {
      headers: { Authorization: `Bearer ${resolve.apiKey}` },
    })
    if (!response.ok) return undefined
    const payload = await response.json() as { balance_infos?: unknown }
    if (!Array.isArray(payload.balance_infos)) return undefined
    return payload.balance_infos.map((row): BalanceInfo => {
      const entry = row as Record<string, unknown>
      return {
        currency: String(entry.currency ?? ''),
        totalBalance: String(entry.total_balance ?? '0'),
        grantedBalance: String(entry.granted_balance ?? '0'),
        toppedUpBalance: String(entry.topped_up_balance ?? '0'),
      }
    })
  } catch {
    return undefined
  }
}

/**
 * Account-balance service. Subclassing is unnecessary for a single provider;
 * load this class as a plugin to register `ctx.billing` (duplicate-service
 * behavior is Cordis' standard).
 */
export class Billing extends Service {
  /** Fresh answer + its capture time, or `undefined` when the last query failed. */
  private cached: { at: number; rows: BalanceInfo[] } | undefined

  /** @param ctx - Cordis context carrying the optional credentials seam and launch environment. */
  constructor(ctx: Context) {
    super(ctx, 'billing')
  }

  /**
   * The current account-balance rows, cached for {@link CACHE_TTL_MS}.
   * @returns the provider's balance rows, or `undefined` when balance cannot be resolved.
   */
  async getBalance(): Promise<BalanceInfo[] | undefined> {
    if (this.cached !== undefined && Date.now() - this.cached.at < CACHE_TTL_MS) return this.cached.rows
    const rows = await this.fetchBalance()
    this.cached = rows === undefined ? undefined : { at: Date.now(), rows }
    return rows
  }

  /** Resolve the API key from the credentials seam, then the trusted environment. */
  private async resolveApiKey(): Promise<string | undefined> {
    const ref = credentialRef(API_KEY_ENV)
    const credentials = this.ctx.get('credentials')
    if (credentials !== undefined) {
      const hit = await credentials.resolve(ref)
      if (hit !== undefined && hit.value.length > 0) return hit.value
      return undefined
    }
    const ambient = launchEnvironmentOf(this.ctx).get(ref)
    if (ambient !== undefined && ambient.value.length > 0) return ambient.value
    return undefined
  }

  /** Resolve the endpoint base: the trusted environment override, else the public API. */
  private resolveBaseUrl(): string {
    return launchEnvironmentOf(this.ctx).get(BASE_URL_ENV)?.value ?? PUBLIC_BASE_URL
  }

  /** One best-effort balance fetch; every failure folds to `undefined` (unavailable). */
  private async fetchBalance(): Promise<BalanceInfo[] | undefined> {
    return queryBalance({ apiKey: await this.resolveApiKey(), baseUrl: this.resolveBaseUrl() })
  }
}

export default Billing
