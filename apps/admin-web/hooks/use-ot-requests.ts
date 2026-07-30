import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OtStatus } from '@hrms/shared-types'
import { type CreateOtBody, otApi } from '@/lib/ot-requests.api'

const otKeys = {
  all: ['ot-requests'] as const,
  my: (params?: object) => [...otKeys.all, 'my', params] as const,
  team: (params?: object) => [...otKeys.all, 'team', params] as const,
  list: (params?: object) => [...otKeys.all, 'list', params] as const,
}

export function useMyOtRequests(params?: { status?: OtStatus; year?: number; month?: number }) {
  return useQuery({
    queryKey: otKeys.my(params),
    queryFn: () => otApi.getMy(params),
  })
}

export function useTeamOtRequests(params?: { status?: OtStatus; year?: number; month?: number }) {
  return useQuery({
    queryKey: otKeys.team(params),
    queryFn: () => otApi.getTeam(params),
    staleTime: 60_000,
  })
}

export function useAllOtRequests(params?: { companyId?: string; status?: OtStatus; year?: number; month?: number; page?: number }) {
  return useQuery({
    queryKey: otKeys.list(params),
    queryFn: () => otApi.getAll(params),
    staleTime: 60_000,
  })
}

export function useCreateOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOtBody) => otApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: otKeys.all }),
  })
}

export function useApproveOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => otApi.approve(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: otKeys.all }),
  })
}

export function useRejectOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => otApi.reject(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: otKeys.all }),
  })
}

export function useCancelOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => otApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: otKeys.all }),
  })
}
