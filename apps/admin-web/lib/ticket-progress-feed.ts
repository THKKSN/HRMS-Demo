export type TicketProgressFeedLane = 'closed' | 'process' | 'hold' | 'waiting' | 'activity'

type TicketProgressFeedEntry = {
  workflowStepKey?: string | null
  workState?: string | null
  blockerReason?: string | null
  nextAction?: string | null
}

export type TicketProgressFeedStyle = {
  lane: TicketProgressFeedLane
  title: string
  laneLabel: string
  badgeClass: string
  surfaceClass: string
  iconClass: string
}

const LANE_VISUALS: Record<
  TicketProgressFeedLane,
  Omit<TicketProgressFeedStyle, 'lane' | 'title'>
> = {
  closed: {
    laneLabel: 'Closed',
    badgeClass:
      'border-emerald-300 bg-emerald-50 text-emerald-800 ' +
      'dark:border-emerald-500/40 dark:bg-emerald-600 dark:text-emerald-200',
    surfaceClass:
      'border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-500/50 ' +
      'dark:border-emerald-500/30 dark:border-l-emerald-400 dark:bg-emerald-600/30',
    iconClass:
      'border-emerald-300 bg-emerald-100/70 text-emerald-700 ' +
      'dark:border-emerald-500/40 dark:bg-emerald-400/30 dark:text-emerald-500',
  },

  process: {
    laneLabel: 'Process',
    badgeClass:
      'border-sky-300 bg-sky-50 text-sky-800 ' +
      'dark:border-sky-500/40 dark:bg-sky-600/60 dark:text-sky-200',
    surfaceClass:
      'border-sky-200 border-l-4 border-l-sky-500 bg-sky-50/50 ' +
      'dark:border-sky-500/30 dark:border-l-sky-400 dark:bg-sky-600/30',
    iconClass:
      'border-sky-300 bg-sky-100/70 text-sky-700 ' +
      'dark:border-sky-500/40 dark:bg-sky-600/60 dark:text-sky-200',
  },

  hold: {
    laneLabel: 'Hold',
    badgeClass:
      'border-amber-300 bg-amber-50 text-amber-900 ' +
      'dark:border-amber-500/40 dark:bg-amber-600/60 dark:text-amber-200',
    surfaceClass:
      'border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/50 ' +
      'dark:border-amber-500/30 dark:border-l-amber-400 dark:bg-amber-600/30',
    iconClass:
      'border-amber-300 bg-amber-100/70 text-amber-800 ' +
      'dark:border-amber-500/40 dark:bg-amber-600/60 dark:text-amber-200',
  },

  waiting: {
    laneLabel: 'Waiting',
    badgeClass:
      'border-violet-300 bg-violet-50 text-violet-800 ' +
      'dark:border-violet-500/40 dark:bg-violet-600/60 dark:text-violet-200',
    surfaceClass:
      'border-violet-200 border-l-4 border-l-violet-500 bg-violet-50/50 ' +
      'dark:border-violet-500/30 dark:border-l-violet-400 dark:bg-violet-600/30',
    iconClass:
      'border-violet-300 bg-violet-100/70 text-violet-700 ' +
      'dark:border-violet-500/40 dark:bg-violet-600/60 dark:text-violet-200',
  },

  activity: {
    laneLabel: 'Activity',
    badgeClass:
      'border-slate-300 bg-slate-100 text-slate-700 ' +
      'dark:border-slate-500/40 dark:bg-slate-900/70 dark:text-slate-200',
    surfaceClass:
      'border-slate-200 border-l-4 border-l-slate-400 bg-slate-50/70 ' +
      'dark:border-slate-600/40 dark:border-l-slate-400 dark:bg-slate-900/45',
    iconClass:
      'border-slate-300 bg-slate-100 text-slate-600 ' +
      'dark:border-slate-500/40 dark:bg-slate-900/70 dark:text-slate-200',
  },
}

const clean = (value?: string | null) => value?.trim() ?? ''
const normalize = (value?: string | null) => clean(value).toLowerCase()

export function getTicketProgressFeedStyle(
  entry: TicketProgressFeedEntry,
): TicketProgressFeedStyle {
  const workflowStepKey = clean(entry.workflowStepKey)
  const workState = clean(entry.workState)
  const blockerReason = clean(entry.blockerReason)
  const nextAction = clean(entry.nextAction)

  let lane: TicketProgressFeedLane
  let title: string

  if (normalize(workflowStepKey) === 'closed' || normalize(workState) === 'closed') {
    lane = 'closed'
    title = workState || workflowStepKey
  } else if (workState) {
    lane = 'process'
    title = workState
  } else if (blockerReason) {
    lane = 'hold'
    title = blockerReason
  } else if (nextAction) {
    lane = 'waiting'
    title = nextAction
  } else {
    lane = 'activity'
    title = workflowStepKey
  }

  return {
    lane,
    title,
    ...LANE_VISUALS[lane],
  }
}
