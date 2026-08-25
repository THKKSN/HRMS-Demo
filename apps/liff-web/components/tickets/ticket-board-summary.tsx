type TicketBoardSummaryProps = {
  workflowCurrentStepLabel?: string
  currentWorkState?: string
  currentBlockerReason?: string
  currentNextAction?: string
}

export function TicketBoardSummary({
  workflowCurrentStepLabel,
  currentWorkState,
  currentBlockerReason,
  currentNextAction,
}: TicketBoardSummaryProps) {
  const items = [
    currentWorkState ? { label: 'กำลังทำ', value: currentWorkState, className: 'border-cyan-200 bg-cyan-50 text-cyan-800' } : null,
    currentBlockerReason ? { label: 'ติด', value: currentBlockerReason, className: 'border-amber-200 bg-amber-50 text-amber-800' } : null,
    currentNextAction ? { label: 'ถัดไป', value: currentNextAction, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; className: string }>

  if (!workflowCurrentStepLabel && items.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      {workflowCurrentStepLabel && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {workflowCurrentStepLabel}
          </span>
        </div>
      )}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <span key={`${item.label}-${item.value}`} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${item.className}`}>
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
