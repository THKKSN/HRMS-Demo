'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { usePermissionGate } from '@/hooks/use-permission-gate'
import type { AuditLogDto } from '@hrms/shared-types'
import {
  UserAvatar, ModuleBadge, ActionText, EntityIdChip,
  AuditLogDetailPanel, fmtDateShort, fmtTime,
  FILTER_MODULES, FILTER_ACTION_GROUPS,
} from '@/components/audit/audit-log-ui'
import * as fmt from '@hrms/i18n/format'

// ── Filters ────────────────────────────────────────────────────────────────────

type Filters = {
  module:   string
  action:   string
  dateFrom: string
  dateTo:   string
}

const DEFAULT_DATE_FROM = (() => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
})()
const DEFAULT_DATE_TO = new Date().toISOString().slice(0, 10)

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const t = useTranslations('admin.settings.audit')
  const tShell = useTranslations('admin.settings.shell')
  const tCommon = useTranslations('common')
  const { has } = usePermissionGate()
  // ให้ตรงกับ endpoint /audit-logs และ gate ของ sidebar
  const isAdmin = has('system:view-audit-logs', ['Admin'])

  const [page,    setPage]    = useState(1)
  const [filters, setFilters] = useState<Filters>({
    module:   '',
    action:   '',
    dateFrom: DEFAULT_DATE_FROM,
    dateTo:   DEFAULT_DATE_TO,
  })

  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null)
  const [panelOpen,   setPanelOpen]   = useState(false)

  const openDetail = (log: AuditLogDto) => {
    setSelectedLog(log)
    setPanelOpen(true)
  }
  const closeDetail = () => setPanelOpen(false)

  const { data, isLoading, isError } = useAuditLogs({
    module:   filters.module   || undefined,
    action:   filters.action   || undefined,
    dateFrom: filters.dateFrom ? `${filters.dateFrom}T00:00:00` : undefined,
    dateTo:   filters.dateTo   ? `${filters.dateTo}T23:59:59`   : undefined,
    page,
    pageSize: 20,
  })

  const handleReset = () => {
    setFilters({ module: '', action: '', dateFrom: DEFAULT_DATE_FROM, dateTo: DEFAULT_DATE_TO })
    setPage(1)
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {tShell('noPagePermission')}
      </div>
    )
  }

  const totalPages = data ? Math.ceil(data.totalCount / 20) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-none">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>
        {data && (
          <span className="ml-auto text-sm text-muted-foreground">
            {t('count', { count: data.totalCount })}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{t('filterModule')}</Label>
            <Select
              value={filters.module}
              onChange={(e) => { setFilters((f) => ({ ...f, module: e.target.value })); setPage(1) }}
              className="w-40"
            >
              <option value="">{t('filterAll')}</option>
              {FILTER_MODULES.map((module) => (
                <option key={module} value={module}>{t(`module.${module}`)}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{t('filterAction')}</Label>
            <Select
              value={filters.action}
              onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1) }}
              className="w-44"
            >
              <option value="">{t('filterAll')}</option>
              {FILTER_ACTION_GROUPS.map((group) => (
                <optgroup key={group.key} label={t(`actionGroup.${group.key}`)}>
                  {group.actions.map((action) => (
                    <option key={action} value={action}>{t(`action.${action}`)}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{t('dateFrom')}</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value })); setPage(1) }}
              className="w-36"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{t('dateTo')}</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value })); setPage(1) }}
              className="w-36"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleReset} className="self-end">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            {t('reset')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-whited/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t('colPerformer')}</th>
                <th className="px-4 py-3 font-medium">{t('colEntityId')}</th>
                <th className="px-4 py-3 font-medium">{t('colAction')}</th>
                <th className="px-4 py-3 font-medium">{t('colModule')}</th>
                <th className="px-4 py-3 font-medium">{t('colDescription')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('colTime')}</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton */}
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-whited animate-pulse" />
                      <div className="h-4 w-28 bg-whited rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="h-5 w-24 bg-whited rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 bg-whited rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-20 bg-whited rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-40 bg-whited rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 bg-whited rounded animate-pulse ml-auto" /></td>
                </tr>
              ))}

              {/* Error */}
              {isError && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-destructive gap-2">
                      <XCircle className="h-8 w-8" />
                      <span className="text-sm">{t('loadError')}</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty */}
              {!isLoading && !isError && data?.items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                      <ShieldCheck className="h-8 w-8 opacity-30" />
                      <span className="text-sm">{t('empty')}</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!isLoading && !isError && data?.items.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => openDetail(log)}
                  className="group cursor-pointer border-b border-border last:border-0 hover:bg-primary/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={log.performedByName} avatarUrl={log.performedByAvatarUrl} />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate max-w-40">
                          {log.performedByName ?? t('unknownUser')}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-40">
                          {log.entityType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <EntityIdChip id={log.entityId} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ActionText action={log.action} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ModuleBadge module={log.module} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="block max-w-70 truncate text-muted-foreground" title={log.description}>
                      {log.description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
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

        {/* Pagination */}
        {data && data.totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-whited/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {t('showingRange', {
                from: fmt.formatNumber(((page - 1) * 20) + 1),
                to: fmt.formatNumber(Math.min(page * 20, data.totalCount)),
                total: fmt.formatNumber(data.totalCount),
              })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail slide-over */}
      <AuditLogDetailPanel log={selectedLog} open={panelOpen} onClose={closeDetail} />
    </div>
  )
}
