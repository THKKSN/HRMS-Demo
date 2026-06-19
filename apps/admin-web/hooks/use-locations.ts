import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '@/lib/locations.api'

export const locationKeys = {
  all: ['locations'] as const,
  list: (companyId?: string, includeInactive?: boolean) =>
    [...locationKeys.all, 'list', { companyId, includeInactive }] as const,
  detail: (id: string) => [...locationKeys.all, 'detail', id] as const,
}

export function useLocations(companyId?: string, includeInactive = false) {
  return useQuery({
    queryKey: locationKeys.list(companyId, includeInactive),
    queryFn: () => locationsApi.getAll(companyId, includeInactive),
    staleTime: 30_000,
  })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: locationsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof locationsApi.update>[1]) =>
      locationsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  })
}
