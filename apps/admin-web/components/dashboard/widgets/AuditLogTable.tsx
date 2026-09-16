'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ShieldCheck } from 'lucide-react'
import type { AdminDashboardDto, AuditLogDto } from '@hrms/shared-types'
import {
  UserAvatar, ModuleBadge, ActionText, EntityIdChip,
  AuditLogDetailPanel, fmtDateShort, fmtTime,
} from '@/components/audit/audit-log-ui'

type Props = { logs: AdminDashboardDto['recentAuditLogs'] }

export function AuditLogTable({ logs }: Props) {
  const t = useTranslations('admin.dashboard.auditLog')
  const tCommon = useTranslations('common')
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null)
  const [panelOpen,   setPanelOpen]   = useState(false)

  const openDetail = (log: AuditLogDto) => {
    setSelectedLog(log)
    setPanelOpen(true)
  }

  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{t('title')}</p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <ShieldCheck className="h-7 w-7 opacity-30" />
          <span className="text-xs">{t('empty')}</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-whited/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Entity ID</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Module</th>
                <th className="px-4 py-2.5 font-medium">Detail</th>
                <th className="px-4 py-2.5 font-medium text-right">TimeStamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => openDetail(log)}
                  className="group cursor-pointer border-b border-border last:border-0 hover:bg-primary/5 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={log.performedByName} avatarUrl={log.performedByAvatarUrl} />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate max-w-40">
                          {log.performedByName ?? t('unknownActor')}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-40">
                          {log.entityType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <EntityIdChip id={log.entityId} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <ActionText action={log.action} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <ModuleBadge module={log.module} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="block max-w-70 truncate text-muted-foreground" title={log.description}>
                      {log.description}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="group-hover:hidden">
                      <div className="text-foreground">{fmtDateShort(log.performedAt)}</div>
                      <div className="text-xs text-muted-foreground font-mono">{fmtTime(log.performedAt)}</div>
                    </div>
                    <span className="hidden group-hover:inline text-sm font-medium text-primary">
                      {tCommon('action.viewDetail')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AuditLogDetailPanel log={selectedLog} open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  )
}
