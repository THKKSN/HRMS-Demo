import { useQuery } from '@tanstack/react-query'
import { memoReportsApi, type MemoReportParams } from '@/lib/memo-reports.api'

export const memoReportKeys = {
  all: ['memo-reports'] as const,
  view: (name: string, params: object) => ['memo-reports', name, params] as const,
}

export function useMemoOverview(params: MemoReportParams) {
  return useQuery({
    queryKey: memoReportKeys.view('overview', params),
    queryFn: () => memoReportsApi.overview(params),
    // ไม่ retry 403 — ผู้ใช้ที่ไม่มีสิทธิ์ memo ให้ซ่อน section ทันที ไม่ต้องยิงซ้ำ
    retry: false,
    staleTime: 60_000,
  })
}
