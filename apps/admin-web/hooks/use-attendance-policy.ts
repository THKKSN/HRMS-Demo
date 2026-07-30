import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { attendancePolicyApi } from '@/lib/attendance-policy.api'
import type { AttendancePolicyDto } from '@hrms/shared-types'

export const policyKeys = {
  policy: (companyId: string) => ['attendance-policy', companyId] as const,
  violations: (companyId: string, year: number, month: number) =>
    ['attendance-policy', 'violations', companyId, year, month] as const,
}

export function useAttendancePolicy(companyId: string) {
  return useQuery<AttendancePolicyDto | null>({
    queryKey: policyKeys.policy(companyId),
    queryFn: () => attendancePolicyApi.get(companyId),
    enabled: !!companyId,
    staleTime: 60_000,
    retry: false,
  })
}

export function useUpsertAttendancePolicy(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: attendancePolicyApi.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: policyKeys.policy(companyId) }),
  })
}

export function useAttendanceViolations(
  companyId: string,
  year: number,
  month: number,
  employeeId?: string,
) {
  return useQuery({
    queryKey: policyKeys.violations(companyId, year, month),
    queryFn: () =>
      attendancePolicyApi.getViolations({ year, month, employeeId, page: 1, pageSize: 100 }),
    enabled: !!companyId,
    staleTime: 60_000,
  })
}
