import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CreateMemoBody, memoApi } from '@/lib/memo.api'
import type { MemoAttachmentInput, MemoStatus } from '@hrms/shared-types'

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
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => memoApi.reject(id, reason),
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

// ── ขั้นตอนที่ตั้งค่าไว้ ────────────────────────────────────────────────────────
// ทุกตัว invalidate ทั้ง memoKeys.all เพราะการปิดขั้นตอนเปลี่ยนทั้ง detail และรายการ inbox/approval

export function useCompleteMemoStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, stepId, note, attachments }: {
      memoId: string; stepId: string; note?: string; attachments?: MemoAttachmentInput[]
    }) => memoApi.completeStep(memoId, stepId, { note, attachments }),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useApproveMemoStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, stepId, comment }: { memoId: string; stepId: string; comment?: string }) =>
      memoApi.approveStep(memoId, stepId, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useRejectMemoStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, stepId, reason }: { memoId: string; stepId: string; reason: string }) =>
      memoApi.rejectStep(memoId, stepId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useReturnMemoStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, stepId, ...body }: {
      memoId: string; stepId: string; reason: string
      targetStepInstanceId?: string; toRequester?: boolean
    }) => memoApi.returnStep(memoId, stepId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useResubmitMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, note }: { memoId: string; note?: string }) =>
      memoApi.resubmit(memoId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

// ── บันทึกความคืบหน้า ──────────────────────────────────────────────────────────
// ไม่เปลี่ยนสถานะเรื่อง จึง invalidate แค่ detail ใบนั้น

export function useAddMemoActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, message, attachments }: {
      memoId: string; message: string; attachments?: MemoAttachmentInput[]
    }) => memoApi.addActivity(memoId, { message, attachments }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: memoKeys.detail(vars.memoId) }),
  })
}

export function useUpdateMemoActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, activityId, message }: {
      memoId: string; activityId: string; message: string
    }) => memoApi.updateActivity(memoId, activityId, message),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: memoKeys.detail(vars.memoId) }),
  })
}
