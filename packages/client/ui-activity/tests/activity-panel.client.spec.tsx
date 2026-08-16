// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { JobView, SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { ActivityPanel } from '../src/client/ActivityPanel.tsx'
import { zh } from '../src/client/locales.ts'

const SESSION = 's1' as SessionId

function job(over: Partial<JobView> = {}): JobView {
  return { id: 'bash-1' as JobView['id'], kind: 'bash', label: 'make test', status: 'running', startedAt: 1_000, ...over }
}

function state(over: Partial<SessionListState> = {}): SessionListState {
  return {
    ids: [SESSION], byId: {}, current: SESSION, phase: 'ready',
    subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
    ...over,
  } as SessionListState
}

function translate(key: unknown, params?: Record<string, unknown>): string {
  const k = String(key)
  let text = zh[k as keyof typeof zh] ?? k
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}

const useSessions: SnapshotSelectorHook<SessionListState> = sel => sel(fakeState)
let fakeState: SessionListState = state()

function renderPanel(): ReturnType<typeof render> {
  return render(<ActivityPanel sessionId={SESSION} useSessions={useSessions} t={translate} />)
}

describe('ActivityPanel', () => {
  it('renders nothing while the session has no live activity', () => {
    fakeState = state()
    const { container } = renderPanel()
    expect(container.firstChild).toBeNull()
  })

  it('lists the running jobs and running subagents', () => {
    fakeState = state({
      jobsBySession: { [SESSION]: [job(), job({ id: 'bash-2' as JobView['id'], label: 'done', status: 'completed' })] },
      subagentsByParent: {
        [SESSION]: {
          state: 'ready', error: null, parentAvailable: true,
          entries: [
            { kind: 'child', id: 'c1' as SessionId, activity: 'running', hasChildren: false, mode: 'one-shot', label: 'scout' },
            { kind: 'child', id: 'c2' as SessionId, activity: 'inactive', hasChildren: false, mode: 'one-shot', label: 'idle' },
          ],
        },
      },
    })
    const { container } = renderPanel()
    expect(container.textContent).toContain('make test')
    expect(container.textContent).not.toContain('done')
    expect(container.textContent).toContain('scout')
    expect(container.textContent).not.toContain('idle')
  })
})
