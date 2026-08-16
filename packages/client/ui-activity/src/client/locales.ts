export type ActivityKey =
  | 'jobs.title'
  | 'subagents.title'
  | 'subagent.running'
  | 'subagent.untitled'
  | 'duration.seconds'
  | 'duration.minutes'
  | 'duration.hours'

export const zh: Record<ActivityKey, string> = {
  'jobs.title': '后台任务',
  'subagents.title': '子代理',
  'subagent.running': '运行中',
  'subagent.untitled': '未命名',
  'duration.seconds': '{seconds} 秒',
  'duration.minutes': '{minutes} 分 {seconds} 秒',
  'duration.hours': '{hours} 小时 {minutes} 分',
}

export const en: Record<ActivityKey, string> = {
  'jobs.title': 'Background tasks',
  'subagents.title': 'Subagents',
  'subagent.running': 'Running',
  'subagent.untitled': 'Untitled',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
}
