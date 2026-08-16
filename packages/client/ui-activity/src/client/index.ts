/**
 * Browser half of the details-panel activity strip: fills ui-conversation's
 * `conversation.details.activity` hole with the current session's running
 * background jobs and running subagents, read entirely from the global session
 * list's `jobsBySession` and `subagentsByParent` mirrors (no RPC).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the `conversation.details.activity` SlotMap entry.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { ActivityPanel } from './ActivityPanel.tsx'
import { en, zh, type ActivityKey } from './locales.ts'

export type { ActivityKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Details-panel activity strip copy. */
    activity: ActivityKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'activity'

/** Services required by the activity strip plugin. */
export const inject = ['slots', 'locale']

/**
 * Register the activity strip into the details-panel activity hole.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-activity: dictionaries')

  ctx.slots.inject('conversation.details.activity', () => ctx.slots.register({
    name: 'conversation.details.activity',
    locale: NS,
  }, ActivityPanel))
}
