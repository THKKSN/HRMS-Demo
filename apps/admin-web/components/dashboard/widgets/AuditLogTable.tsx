import type { AdminDashboardDto } from '@hrms/shared-types'

type Props = { logs: AdminDashboardDto['recentAuditLogs'] }

const MODULE_LABEL: Record<string, string> = {
  employee:  'พนักงาน',
  company:   'บริษัท',
  department:'แผนก',
  leave:     'การลา',
  attendance:'เข้างาน',
}

const ACTION_COLOR: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  toggle: 'bg-gray-100 text-gray-700',
}

export function AuditLogTable({ logs }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Audit Log ล่าสุด</p>
      </div>
      {logs.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">ไม่มีข้อมูล</p>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map(log => (
            <li key={log.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {log.action}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-foreground">{log.description}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {MODULE_LABEL[log.module] ?? log.module} · {log.performedByName} ·{' '}
                  {new Date(log.performedAt).toLocaleString('th-TH', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
