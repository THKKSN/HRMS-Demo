import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memoApi } from '@/lib/memo.api'
import type { MemoStatus } from '@hrms/shared-types'

export const memoKeys = {
  all: ['memo'] as const,
  types: (includeInactive = false) => [...memoKeys.all, 'types', includeInactive] as const,
  categories: (memoTypeId: string, includeInactive = false) =>
    [...memoKeys.all, 'categories', memoTypeId, includeInactive] as const,
  subCategories: (memoCategoryId: string, includeInactive = false) =>
    [...memoKeys.all, 'sub-categories', memoCategoryId, includeInactive] as const,
  forApproval: (status?: MemoStatus) => [...memoKeys.all, 'for-approval', status ?? 'all'] as const,
  byId: (id: string) => [...memoKeys.all, 'detail', id] as const,
  mine: (status?: MemoStatus) => [...memoKeys.all, 'mine', status ?? 'all'] as const,
  inbox: (includeDelivered: boolean) => [...memoKeys.all, 'inbox', includeDelivered] as const,
}

export function useMemoTypes(includeInactive = false) {
  return useQuery({
    queryKey: memoKeys.types(includeInactive),
    queryFn: () => memoApi.getTypes(includeInactive),
    staleTime: 30_000,
  })
}

export function useCreateMemoType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: memoApi.createType,
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useUpdateMemoType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; companyId: string; departmentId: string }) =>
      memoApi.updateType(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useToggleMemoTypeStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      memoApi.toggleTypeStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useMemoCategories(memoTypeId: string, includeInactive = false) {
  return useQuery({
    queryKey: memoKeys.categories(memoTypeId, includeInactive),
    queryFn: () => memoApi.getCategories(memoTypeId, includeInactive),
    enabled: !!memoTypeId,
  })
}

export function useCreateMemoCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: memoApi.createCategory,
    onSuccess: (item) => qc.invalidateQueries({ queryKey: memoKeys.categories(item.memoTypeId) }),
  })
}

export function useUpdateMemoCategory(memoTypeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => memoApi.updateCategory(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.categories(memoTypeId) }),
  })
}

export function useToggleMemoCategoryStatus(memoTypeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      memoApi.toggleCategoryStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.categories(memoTypeId) }),
  })
}

export function useMemoSubCategories(memoCategoryId: string, includeInactive = false) {
  return useQuery({
    queryKey: memoKeys.subCategories(memoCategoryId, includeInactive),
    queryFn: () => memoApi.getSubCategories(memoCategoryId, includeInactive),
    enabled: !!memoCategoryId,
  })
}

export function useCreateMemoSubCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: memoApi.createSubCategory,
    onSuccess: (item) => qc.invalidateQueries({ queryKey: memoKeys.subCategories(item.memoCategoryId) }),
  })
}

export function useUpdateMemoSubCategory(memoCategoryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => memoApi.updateSubCategory(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.subCategories(memoCategoryId) }),
  })
}

export function useToggleMemoSubCategoryStatus(memoCategoryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      memoApi.toggleSubCategoryStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.subCategories(memoCategoryId) }),
  })
}

export function useMemosForApproval(status?: MemoStatus) {
  return useQuery({
    queryKey: memoKeys.forApproval(status),
    queryFn: () => memoApi.getForApproval(status),
    staleTime: 10_000,
  })
}

export function useMemoById(id: string) {
  return useQuery({
    queryKey: memoKeys.byId(id),
    queryFn: () => memoApi.getById(id),
    enabled: !!id,
  })
}

export function useApproveMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => memoApi.approve(id, comment),
    // invalidate ทั้ง module — สถานะเรื่องเดียวกระทบทั้ง list อนุมัติ, inbox แผนก, และหน้า detail
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

export function useMyMemos(status?: MemoStatus) {
  return useQuery({
    queryKey: memoKeys.mine(status),
    queryFn: () => memoApi.getMine(status),
  })
}

export function useCreateMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: memoApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...memoKeys.all, 'mine'] }),
  })
}

export function useMemoInbox(includeDelivered = false) {
  return useQuery({
    queryKey: memoKeys.inbox(includeDelivered),
    queryFn: () => memoApi.getInbox(includeDelivered),
    staleTime: 10_000,
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

export function useReceiveMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => memoApi.receive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}
