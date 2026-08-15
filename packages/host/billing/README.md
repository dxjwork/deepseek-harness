# Billing

DeepSeek account-balance capability for the Web GUI. One host service
(`ctx.billing`) resolves the DeepSeek API key and base URL, queries
`GET {base}/user/balance`, and returns the balance rows — or `undefined` when
the endpoint is unreachable, the key is missing, or the composition points at a
gateway without the balance route. A short cache keeps GUI polling cheap.

The API proxy's `host.getBalance` delegates here; an absent service answers
`available: false` so the sidebar status renders a placeholder instead of an
error. The value is a display reference, never a billing or gating input.

## Model experience

Indirect. This package exposes no model-visible behavior: it only resolves a
host account balance for a browser status card. The sidebar consumer owns any
model-visible or user-visible rendering of the value.
