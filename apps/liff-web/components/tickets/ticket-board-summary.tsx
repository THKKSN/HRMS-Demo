import { useTranslations } from 'next-intl'

type TicketBoardSummaryProps = {
  workflowCurrentStepLabel?: string
  currentWorkState?: string
  currentBlockerReason?: string
  currentNextAction?: string
}

// สรุปสถานะบอร์ดบนการ์ดรายการ — ค่า (workState ฯลฯ) เป็นข้อความที่ผู้ใช้พิมพ์เอง ไม่แปล
export function TicketBoardSummary({
  workflowCurrentStepLabel,
  currentWorkState,
  currentBlockerReason,
  currentNextAction,
}: TicketBoardSummaryProps) {
  const t = useTranslations('liff.ticket.board')
  const items = [
    currentWorkState ? { label: t('working'), value: currentWorkState, className: 'border-cyan-200 bg-cyan-50 text-cyan-800' } : null,
    currentBlockerReason ? { label: t('blocked'), value: currentBlockerReason, className: 'border-amber-200 bg-amber-50 text-amber-800' } : null,
    currentNextAction ? { label: t('next'), value: currentNextAction, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' } : null,
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
