'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { localizedName, type Locale } from '@hrms/i18n'
import { PageHeader } from '@/components/layout/page-header'
import { LeaveStatusBadge } from '@/components/shared/leave-status-badge'
import { useFmt } from '@/hooks/use-fmt'
import { usePendingApprovals } from '@/hooks/use-leaves'
import { hasPermission } from '@/lib/auth-utils'
import { useAuthStore } from '@/stores/auth.store'

export default function PendingApprovalsPage() {
  const t = useTranslations('liff.leave.pending')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const fmt = useFmt()
  const router = useRouter()
  const employee = useAuthStore(s => s.employee)
  const canApprove = hasPermission(employee, 'leave:approve-supervisor', ['Supervisor', 'Hr', 'Admin'])
  const { data, isLoading } = usePendingApprovals()

  useEffect(() => {
    if (employee && !canApprove) {
      router.replace('/leaves')
    }
  }, [employee, canApprove, router])

  if (!employee || !canApprove) return null

  return (
    <>
      <PageHeader title={t('title')} backHref="/leaves" />

      <div className="flex flex-col gap-3 px-4 pb-24 pt-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-whited" />
          ))
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="mt-4 text-sm font-medium">{t('empty')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('emptyHint')}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {t('count', { count: data.totalCount })}
            </p>
            {data.items.map(item => (
              <Link
                key={item.id}
                href={`/leaves/${item.id}`}
                className="rounded-xl border bg-white p-4 shadow-sm active:bg-whited"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.employeeName}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {localizedName(
                        { name: item.leaveTypeName, nameEn: item.leaveTypeNameEn, nameId: item.leaveTypeNameId },
                        locale,
                      )}
                    </p>
                  </div>
                  <LeaveStatusBadge status={item.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {fmt.formatDate(item.dateFrom)}
                    {item.dateFrom !== item.dateTo && ` – ${fmt.formatDate(item.dateTo)}`}
                  </span>
                  <span>{tCommon('duration.days', { count: item.totalDays })}</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  )
}
