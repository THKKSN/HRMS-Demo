'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { useTranslations } from 'next-intl'
import type { CompanyDashboardDto } from '@hrms/shared-types'
import * as fmt from '@hrms/i18n/format'

type Props = { trend: CompanyDashboardDto['monthlyTrend'] }

export function AttendanceTrendChart({ trend }: Props) {
  const t = useTranslations('admin.dashboard.attendance')
  const data = trend.map(d => ({
    ...d,
    label: fmt.formatDate(new Date(d.date), { day: 'numeric', month: 'short' }),
  }))

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-foreground">{t('trendTitle')}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="present"  name={t('seriesPresent')} stroke="#22c55e" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="late"     name={t('seriesLate')}    stroke="#f59e0b" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="absent"   name={t('seriesAbsent')}  stroke="#ef4444" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="onLeave"  name={t('seriesOnLeave')} stroke="#a855f7" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
