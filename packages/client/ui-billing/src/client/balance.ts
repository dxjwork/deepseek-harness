/** One currency row of the account balance, as the host `host.getBalance` reports it. */
export interface BalanceRow {
  /** ISO currency code (e.g. `CNY`). */
  currency: string
  /** Total available balance as the provider's decimal string. */
  totalBalance: string
  /** Granted (promotional) balance as the provider's decimal string. */
  grantedBalance: string
  /** Topped-up balance as the provider's decimal string. */
  toppedUpBalance: string
}

/** Live balance state pushed from the host balance RPC. */
export type BalanceState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; rows: readonly BalanceRow[] }
