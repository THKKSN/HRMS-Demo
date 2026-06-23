import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '@/lib/companies.api'

export const companyKeys = {
  all: ['companies'] as const,
  list: (includeInactive: boolean) => [...companyKeys.all, 'list', { includeInactive }] as const,
  detail: (id: string) => [...companyKeys.all, 'detail', id] as const,
}

export function useCompanies(includeInactive = false) {
  return useQuery({
    queryKey: companyKeys.list(includeInactive),
    queryFn: () => companiesApi.getAll(includeInactive),
    staleTime: 60_000,
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companiesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.all }),
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name: string
      nameEn?: string
      orgType: string
      parentId?: string
      isActive: boolean
      isHeadquarters: boolean
    }) => companiesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.all }),
  })
}
