import { memo, useMemo } from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { SnapshotSelectorHook, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { BalanceState } from './balance.ts'
import { billedInputTokens, cumulativeUsage, formatTokens } from './usage.ts'
import css from './BillingStatus.module.css'

/** Props: the sidebar footer-status owner share, the global session list, the balance hook + refresh, and locale. */
export interface BillingStatusProps {
  /** Whether the sidebar renders wide content (false = 56px rail, where the card hides). */
  wide: boolean
  /** Global session list selector for current + cumulative token usage. */
  useSessions: SnapshotSelectorHook<SessionListState>
  /** Selector over the private balance source (loading / unavailable / ready). */
  useBalance: SnapshotSelectorHook<BalanceState>
  /** Re-query the host balance. */
  refresh: () => void
  /** Namespace-bound translate (the `billing` dictionary). */
  t: TranslateNS<'billing'>
}

/** Sidebar footer status card: DeepSeek balance plus current and cumulative token usage. */
export const BillingStatus = memo(function BillingStatus({
  wide, useSessions, useBalance, refresh, t,
}: BillingStatusProps) {
  const list = useSessions(s => s)
  const balance = useBalance(s => s)
  const usage = useMemo(() => {
    const current = list.current === undefined
      ? undefined
      : list.byId[list.current]?.projectionValues?.tokenUsage
    return { current, total: cumulativeUsage(list.byId) }
  }, [list])

  // The 56px rail has no room for a card; the shell reserves the foot for wide content only.
  if (!wide) return null

  const amount = balance.status === 'ready'
    ? balance.rows[0] === undefined
      ? t('balance.unavailable')
      : `${balance.rows[0].currency} ${balance.rows[0].totalBalance}`
    : balance.status === 'loading'
      ? '…'
      : t('balance.unavailable')

  const current = usage.current
  const currentLine = current === undefined
    ? undefined
    : t('usage.inOut', {
      in: formatTokens(billedInputTokens(current)),
      out: formatTokens(current.outputTokens),
    })

  return (
    <div className={css.root}>
      <div className={css.balanceRow}>
        <span className={css.label}>{t('balance.label')}</span>
        <span className={css.amount}>{amount}</span>
        <button type="button" className={css.refresh} onClick={refresh} aria-label={t('balance.refresh')}>
          ↻
        </button>
      </div>
      {currentLine !== undefined && (
        <div className={css.usageRow}>
          <span className={css.label}>{t('usage.current')}</span>
          <span className={css.value}>{currentLine}</span>
        </div>
      )}
      <div className={css.usageRow}>
        <span className={css.label}>{t('usage.total')}</span>
        <span className={css.value}>
          {t('usage.inOut', {
            in: formatTokens(billedInputTokens(usage.total)),
            out: formatTokens(usage.total.outputTokens),
          })}
        </span>
      </div>
    </div>
  )
})
