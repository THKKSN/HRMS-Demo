import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CreateMemoBody, memoApi } from '@/lib/memo.api'
import type { MemoStatus } from '@hrms/shared-types'

export const memoKeys = {
  all: ['memos'] as const,
  types: () => [...memoKeys.all, 'types'] as const,
  categories: (memoTypeId?: string) => [...memoKeys.all, 'categories', memoTypeId] as const,
  subCategories: (memoCategoryId?: string) => [...memoKeys.all, 'sub-categories', memoCategoryId] as const,
  mine: (status?: MemoStatus) => [...memoKeys.all, 'mine', status ?? 'all'] as const,
  forApproval: (status?: MemoStatus) => [...memoKeys.all, 'for-approval', status ?? 'all'] as const,
  inbox: (includeDelivered: boolean) => [...memoKeys.all, 'inbox', includeDelivered] as const,
  detail: (id: string) => [...memoKeys.all, 'detail', id] as const,
}

export function useMemoTypes() {
  return useQuery({
    queryKey: memoKeys.types(),
    queryFn: memoApi.getTypes,
  })
}

export function useMemoCategories(memoTypeId?: string) {
  return useQuery({
    queryKey: memoKeys.categories(memoTypeId),
    queryFn: () => memoApi.getCategories(memoTypeId!),
    enabled: !!memoTypeId,
  })
}

export function useMemoSubCategories(memoCategoryId?: string) {
  return useQuery({
    queryKey: memoKeys.subCategories(memoCategoryId),
    queryFn: () => memoApi.getSubCategories(memoCategoryId!),
    enabled: !!memoCategoryId,
  })
}

export function useMyMemos(status?: MemoStatus) {
  return useQuery({
    queryKey: memoKeys.mine(status),
    queryFn: () => memoApi.getMine(status),
  })
}

export function useMemoDetail(id: string) {
  return useQuery({
    queryKey: memoKeys.detail(id),
    queryFn: () => memoApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateMemoBody) => memoApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useReceiveMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => memoApi.receive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useMemosForApproval(status?: MemoStatus, enabled = true) {
  return useQuery({
    queryKey: memoKeys.forApproval(status),
    queryFn: () => memoApi.getForApproval(status),
    enabled,
    staleTime: 10_000,
  })
}

export function useMemoInbox(includeDelivered = false, enabled = true) {
  return useQuery({
    queryKey: memoKeys.inbox(includeDelivered),
    queryFn: () => memoApi.getInbox(includeDelivered),
    enabled,
    staleTime: 10_000,
  })
}

export function useApproveMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => memoApi.approve(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useRejectMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => memoApi.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useAcknowledgeMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => memoApi.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useDeliverMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => memoApi.deliver(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}
