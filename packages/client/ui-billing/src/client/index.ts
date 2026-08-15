/**
 * Browser half of the sidebar billing status: fills ui-sidebar's
 * `sidebar.footer.status` hole with a card showing the DeepSeek account
 * balance (via `host.getBalance`) plus current and cumulative session token
 * usage (derived from the global session list's retained projections).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the `sidebar.footer.status` SlotMap entry.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { BalanceState } from './balance.ts'
import { BillingStatus } from './BillingStatus.tsx'
import { en, zh, type BillingKey } from './locales.ts'

export type { BillingKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Sidebar billing status copy. */
    billing: BillingKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'billing'

/** Balance re-query interval; the host caches for a minute, so this stays cheap. */
const REFRESH_MS = 60_000

/** Services required by the billing status plugin. */
export const inject = ['slots', 'connection', 'locale']

/**
 * Register the billing status card into the sidebar footer-status hole.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-billing: dictionaries')

  let balance: BalanceState = { status: 'loading' }
  const listeners = new Set<() => void>()
  const source: HostObservable<BalanceState> = {
    getSnapshot: () => balance,
    subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } },
  }
  const setBalance = (next: BalanceState): void => {
    balance = next
    for (const fn of [...listeners]) fn()
  }

  const refresh = (): void => {
    const api = (ctx.get('connection') as ConnectionHandle).api
    void api.host.getBalance({}).then(
      (response) => {
        if (!response.result.ok) { setBalance({ status: 'unavailable' }); return }
        const { available, balanceInfos } = response.result.value
        setBalance(available && balanceInfos.length > 0
          ? { status: 'ready', rows: balanceInfos }
          : { status: 'unavailable' })
      },
      () => { setBalance({ status: 'unavailable' }) },
    )
  }

  refresh()
  const timer = setInterval(refresh, REFRESH_MS)
  ctx.effect(() => () => { clearInterval(timer) }, 'ui-billing: balance polling')

  ctx.slots.inject('sidebar.footer.status', () => ctx.slots.register({
    name: 'sidebar.footer.status',
    locale: NS,
    inject: () => ({ hooks: { balance: source }, refresh }),
  }, BillingStatus))
}
