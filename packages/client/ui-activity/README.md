# Activity strip

Details-panel activity strip. The browser half fills ui-conversation's
`conversation.details.activity` hole at the top of the details panel with the
current session's running background jobs and running subagents, read entirely
from the global session list's `jobsBySession` and `subagentsByParent` mirrors
(no RPC). It renders nothing while the session has no live activity.

## Model experience

None. This package renders host-computed registry state for a human and touches
no prompt, message, schema, stream, or tool result.
