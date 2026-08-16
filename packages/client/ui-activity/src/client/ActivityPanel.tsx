import { memo, useEffect, useMemo, useState } from 'react'
import type { JobView, SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import css from './ActivityPanel.module.css'

/** Props: the details-panel session standard kit (sessionId + useSessions) plus the namespace translator. */
export interface ActivityPanelProps {
  /** The current session the strip reports activity for. */
  sessionId: SessionId
  /** Global session list selector for the jobs mirror and subagent catalogs. */
  useSessions: SnapshotSelectorHook<SessionListState>
  /** Namespace-bound translate (the `activity` dictionary). */
  t: TranslateNS<'activity'>
}

/** Stable empty list so a session with no jobs keeps one array identity. */
const NO_JOBS: readonly JobView[] = []

/** A job the registry still holds open. */
function isLive(job: JobView): boolean {
  return job.status === 'running' || job.status === 'stopping'
}

/** Elapsed time in at most two adjacent units, matching the session-header list. */
function formatElapsed(ms: number, t: TranslateNS<'activity'>): string {
  const total = Math.max(0, Math.floor(ms / 1_000))
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3_600)
  if (hours > 0) return t('duration.hours', { hours, minutes })
  if (minutes > 0) return t('duration.minutes', { minutes, seconds })
  return t('duration.seconds', { seconds })
}

/**
 * Live activity strip at the top of the details panel: the current session's
 * running background jobs and running subagents. Renders nothing while the
 * session has no live activity.
 * @param props - the session standard kit and locale seat.
 * @returns the activity list, or null when idle.
 */
export const ActivityPanel = memo(function ActivityPanel({ sessionId, useSessions, t }: ActivityPanelProps) {
  const jobs = useSessions(s => s.jobsBySession[sessionId]) ?? NO_JOBS
  const catalog = useSessions(s => s.subagentsByParent[sessionId])
  const [now, setNow] = useState(() => Date.now())

  const liveJobs = useMemo(() => jobs.filter(isLive), [jobs])
  const runningSubagents = useMemo(() => {
    const rows: { id: string; label: string }[] = []
    for (const entry of catalog?.entries ?? []) {
      if (entry.kind !== 'child' || entry.activity !== 'running') continue
      rows.push({ id: entry.id, label: entry.label ?? t('subagent.untitled') })
    }
    return rows
  }, [catalog, t])

  // The clock only runs while there is a live job whose elapsed time ticks.
  useEffect(() => {
    if (liveJobs.length === 0) return
    setNow(Date.now())
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [liveJobs.length])

  if (liveJobs.length === 0 && runningSubagents.length === 0) return null

  return (
    <div className={css.root}>
      {liveJobs.length > 0 && (
        <section className={css.section}>
          <div className={css.title}>{t('jobs.title')}</div>
          <ul className={css.list}>
            {liveJobs.map(job => (
              <li key={job.id} className={css.row}>
                <StateDot state="ongoing" className={css.dot} />
                <span className={css.label} title={job.label}>{job.label}</span>
                <span className={css.meta}>{formatElapsed(now - job.startedAt, t)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {runningSubagents.length > 0 && (
        <section className={css.section}>
          <div className={css.title}>{t('subagents.title')}</div>
          <ul className={css.list}>
            {runningSubagents.map(entry => (
              <li key={entry.id} className={css.row}>
                <StateDot state="ongoing" className={css.dot} />
                <span className={css.label} title={entry.label}>{entry.label}</span>
                <span className={css.meta}>{t('subagent.running')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
})
