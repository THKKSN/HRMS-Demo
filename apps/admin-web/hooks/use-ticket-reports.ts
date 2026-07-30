import { useQuery } from '@tanstack/react-query'
import { ticketReportsApi, type TicketReportParams } from '@/lib/ticket-reports.api'

export const ticketReportKeys = {
  all: ['ticket-reports'] as const,
  view: (name: string, params: object) => ['ticket-reports', name, params] as const,
}

export function useTicketReportScope() {
  return useQuery({ queryKey: ticketReportKeys.view('scope', {}), queryFn: ticketReportsApi.scope, staleTime: 60_000 })
}

export function useTicketReportSummary(params: TicketReportParams) {
  return useQuery({ queryKey: ticketReportKeys.view('summary', params), queryFn: () => ticketReportsApi.summary(params) })
}
export function useTicketTrend(params: TicketReportParams) {
  return useQuery({ queryKey: ticketReportKeys.view('trend', params), queryFn: () => ticketReportsApi.trend(params) })
}
export function useTicketBacklog(params: TicketReportParams & { page?: number; pageSize?: number }) {
  return useQuery({ queryKey: ticketReportKeys.view('backlog', params), queryFn: () => ticketReportsApi.backlog(params) })
}
export function useTicketCategoryReport(params: TicketReportParams) {
  return useQuery({ queryKey: ticketReportKeys.view('categories', params), queryFn: () => ticketReportsApi.categories(params) })
}
export function useTicketWorkloadReport(params: TicketReportParams) {
  return useQuery({ queryKey: ticketReportKeys.view('workload', params), queryFn: () => ticketReportsApi.workload(params) })
}
export function useTicketQualityReport(params: TicketReportParams) {
  return useQuery({ queryKey: ticketReportKeys.view('quality', params), queryFn: () => ticketReportsApi.quality(params) })
}
export function useTicketRoutingReport(params: TicketReportParams) {
  return useQuery({ queryKey: ticketReportKeys.view('routing', params), queryFn: () => ticketReportsApi.routing(params) })
}
