export type BillingKey =
  | 'balance.label'
  | 'balance.refresh'
  | 'balance.unavailable'
  | 'usage.current'
  | 'usage.total'
  | 'usage.inOut'

export const zh: Record<BillingKey, string> = {
  'balance.label': '余额',
  'balance.refresh': '刷新余额',
  'balance.unavailable': '—',
  'usage.current': '本会话',
  'usage.total': '累计',
  'usage.inOut': '入 {in} · 出 {out}',
}

export const en: Record<BillingKey, string> = {
  'balance.label': 'Balance',
  'balance.refresh': 'Refresh balance',
  'balance.unavailable': '—',
  'usage.current': 'Session',
  'usage.total': 'Total',
  'usage.inOut': 'In {in} · Out {out}',
}
