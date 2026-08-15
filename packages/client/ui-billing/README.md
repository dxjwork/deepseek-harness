# Billing status

Sidebar billing status card. The browser half fills ui-sidebar's
`sidebar.footer.status` hole with a card showing the DeepSeek account balance
(via `host.getBalance`) plus the current session's and the cumulative token
usage (derived from the global session list's retained `tokenUsage`
projections). The card hides in the collapsed rail and shows a placeholder
while the balance is loading or unavailable.

## Model experience

Indirect. This package renders user-facing status only; it contributes nothing
to any session log or model request. Balance and token figures are
presentation over existing durable projections and a host query.
