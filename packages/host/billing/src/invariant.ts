/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-billing`.
 * @module @deepseek-ai/dsh-billing/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-billing'

/** Cordis companion plugin name. */
export const name = 'billing-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a read-only, on-demand balance query that emits no
 * Cordis events and owns no cross-plugin mutable state beyond its private
 * cache; query behavior is asserted directly by this package's spec.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
