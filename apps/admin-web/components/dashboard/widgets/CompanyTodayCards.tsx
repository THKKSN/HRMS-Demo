import { UserCheck, Clock, UserX, CalendarOff, Globe, Building2 } from 'lucide-react'
import type { CompanyDashboardDto } from '@hrms/shared-types'

type Props = {
  stats: CompanyDashboardDto['todayStats']
  totalEmployees: number
  isSystemWide: boolean
}

export function CompanyTodayCards({ stats, totalEmployees, isSystemWide }: Props) {
  const cards = [
    { icon: UserCheck,   label: 'มาทำงาน', value: stats.present,  sub: `${stats.attendanceRate.toFixed(1)}%`, color: 'text-green-600',  bg: 'bg-green-50'  },
    { icon: Clock,       label: 'มาสาย',   value: stats.late,     sub: null,                                  color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { icon: UserX,       label: 'ขาดงาน',  value: stats.absent,   sub: null,                                  color: 'text-red-600',    bg: 'bg-red-50'    },
    { icon: CalendarOff, label: 'ลา',       value: stats.onLeave,  sub: null,                                  color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ภาพรวมวันนี้
          </p>
          {isSystemWide ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              <Globe className="h-3 w-3" /> ทุกบริษัท
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
              <Building2 className="h-3 w-3" /> บริษัทของคุณ
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">ทั้งหมด {totalEmployees} คน</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className={`inline-flex rounded-xl ${c.bg} p-2`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className={`mt-2 text-3xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
            {c.sub && <p className={`text-xs font-semibold ${c.color}`}>{c.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
