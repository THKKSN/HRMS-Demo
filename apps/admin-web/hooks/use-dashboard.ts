import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/dashboard.api'

export const dashboardKeys = {
  my:                  ['dashboard', 'my']                  as const,
  team:                ['dashboard', 'team']                as const,
  company: (id?: string) => ['dashboard', 'company', id ?? 'all'] as const,
  companies:           ['dashboard', 'companies']           as const,
  admin:               ['dashboard', 'admin']               as const,
}

export function useMyDashboard() {
  return useQuery({
    queryKey: dashboardKeys.my,
    queryFn:  dashboardApi.getMy,
    staleTime: 60_000,
  })
}

export function useTeamDashboard() {
  return useQuery({
    queryKey: dashboardKeys.team,
    queryFn:  dashboardApi.getTeam,
    staleTime: 60_000,
  })
}

export function useCompanyDashboard(companyId?: string) {
  return useQuery({
    queryKey: dashboardKeys.company(companyId),
    queryFn:  () => dashboardApi.getCompany(companyId),
    staleTime: 60_000,
  })
}

export function useAccessibleCompanies() {
  return useQuery({
    queryKey: dashboardKeys.companies,
    queryFn:  dashboardApi.getAccessibleCompanies,
    staleTime: 5 * 60_000, // 5 นาที — list บริษัทเปลี่ยนช้า
  })
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: dashboardKeys.admin,
    queryFn:  dashboardApi.getAdmin,
    staleTime: 60_000,
  })
}
