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
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200',
    surfaceClass: 'border-emerald-200 border-l-4 border-l-emerald-500 bg-background dark:border-emerald-500/30 dark:border-l-emerald-400 dark:bg-emerald-950/30',
    iconClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200',
  },
  process: {
    laneLabel: 'Process',
    badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-950/60 dark:text-cyan-200',
    surfaceClass: 'border-cyan-200 border-l-4 border-l-cyan-500 bg-background dark:border-cyan-500/30 dark:border-l-cyan-400 dark:bg-cyan-950/30',
    iconClass: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-950/60 dark:text-cyan-200',
  },
  hold: {
    laneLabel: 'Wait',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200',
    surfaceClass: 'border-amber-200 border-l-4 border-l-amber-500 bg-background dark:border-amber-500/30 dark:border-l-amber-400 dark:bg-amber-950/30',
    iconClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200',
  },
  waiting: {
    laneLabel: 'ต้องทำอะไรต่อ',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200',
    surfaceClass: 'border-emerald-200 border-l-4 border-l-emerald-500 bg-background dark:border-emerald-500/30 dark:border-l-emerald-400 dark:bg-emerald-950/30',
    iconClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200',
  },
  activity: {
    laneLabel: 'Activity',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/70 dark:text-slate-200',
    surfaceClass: 'border-slate-200 border-l-4 border-l-slate-400 bg-background dark:border-slate-600/40 dark:border-l-slate-400 dark:bg-slate-900/45',
    iconClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/40 dark:bg-slate-900/70 dark:text-slate-200',
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
