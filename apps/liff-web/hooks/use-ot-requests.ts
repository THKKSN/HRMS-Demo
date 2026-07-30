import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OtStatus } from '@hrms/shared-types'
import { type CreateOtBody, otApi } from '@/lib/ot-requests.api'

export const otKeys = {
  all: ['ot-requests'] as const,
  myList: (params?: object) => [...otKeys.all, 'my', params] as const,
  teamList: (params?: object) => [...otKeys.all, 'team', params] as const,
  detail: (id: string) => [...otKeys.all, 'detail', id] as const,
}

export function useMyOtRequests(params?: { status?: OtStatus; year?: number; month?: number }) {
  return useQuery({
    queryKey: otKeys.myList(params),
    queryFn: () => otApi.getMy({ ...params, pageSize: 100 }),
    staleTime: 30_000,
  })
}

export function useTeamOtRequests(params?: { status?: OtStatus; year?: number; month?: number }) {
  return useQuery({
    queryKey: otKeys.teamList(params),
    queryFn: () => otApi.getTeam({ ...params, pageSize: 100 }),
    staleTime: 30_000,
  })
}

export function useOtRequestById(id: string) {
  return useQuery({
    queryKey: otKeys.detail(id),
    queryFn: () => otApi.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOtBody) => otApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: otKeys.all }),
  })
}

export function useCancelOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => otApi.cancel(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: otKeys.all })
      qc.invalidateQueries({ queryKey: otKeys.detail(id) })
    },
  })
}

export function useApproveOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => otApi.approve(id, comment),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: otKeys.all })
      qc.invalidateQueries({ queryKey: otKeys.detail(id) })
    },
  })
}

export function useRejectOtRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => otApi.reject(id, comment),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: otKeys.all })
      qc.invalidateQueries({ queryKey: otKeys.detail(id) })
    },
  })
}
