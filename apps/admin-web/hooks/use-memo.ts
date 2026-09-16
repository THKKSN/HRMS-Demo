import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memoApi, type FirstApproverInput, type MemoTypeInput, type MemoWorkflowStepInput } from '@/lib/memo.api'
import type { MemoAttachmentInput, MemoStatus } from '@hrms/shared-types'

export const memoKeys = {
  all: ['memo'] as const,
  types: (includeInactive = false) => [...memoKeys.all, 'types', includeInactive] as const,
  categories: (memoTypeId: string, includeInactive = false) =>
    [...memoKeys.all, 'categories', memoTypeId, includeInactive] as const,
  subCategories: (memoCategoryId: string, includeInactive = false) =>
    [...memoKeys.all, 'sub-categories', memoCategoryId, includeInactive] as const,
  workflowSteps: (memoTypeId: string, includeInactive = false) =>
    [...memoKeys.all, 'workflow-steps', memoTypeId, includeInactive] as const,
  forApproval: (status?: MemoStatus) => [...memoKeys.all, 'for-approval', status ?? 'all'] as const,
  byId: (id: string) => [...memoKeys.all, 'detail', id] as const,
  mine: (status?: MemoStatus) => [...memoKeys.all, 'mine', status ?? 'all'] as const,
  inbox: (includeDelivered: boolean) => [...memoKeys.all, 'inbox', includeDelivered] as const,
  stepTasks: () => [...memoKeys.all, 'step-tasks'] as const,
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
    mutationFn: ({ id, ...body }: { id: string } & MemoTypeInput) => memoApi.updateType(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useSetMemoTypeFirstApprover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & FirstApproverInput) =>
      memoApi.setFirstApprover(id, body),
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
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof memoApi.updateCategory>[1]) =>
      memoApi.updateCategory(id, body),
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
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof memoApi.updateSubCategory>[1]) =>
      memoApi.updateSubCategory(id, body),
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
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => memoApi.reject(id, reason),
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

// ─── Workflow steps (config ต่อ MemoType) ────────────────────────────────────

export function useMemoWorkflowSteps(memoTypeId: string, includeInactive = false) {
  return useQuery({
    queryKey: memoKeys.workflowSteps(memoTypeId, includeInactive),
    queryFn: () => memoApi.getWorkflowSteps(memoTypeId, includeInactive),
    enabled: !!memoTypeId,
  })
}

export function useCreateMemoWorkflowStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoTypeId, ...body }: { memoTypeId: string } & MemoWorkflowStepInput) =>
      memoApi.createWorkflowStep(memoTypeId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useUpdateMemoWorkflowStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & MemoWorkflowStepInput) =>
      memoApi.updateWorkflowStep(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

export function useToggleMemoWorkflowStepStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      memoApi.toggleWorkflowStepStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: memoKeys.all }),
  })
}

// ─── Step actions ระหว่างดำเนินการ ───────────────────────────────────────────

export function useMemoStepTasks() {
  return useQuery({
    queryKey: memoKeys.stepTasks(),
    queryFn: () => memoApi.getStepTasks(),
    staleTime: 10_000,
  })
}

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

export function useAddMemoActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, message, attachments }: {
      memoId: string; message: string; attachments?: MemoAttachmentInput[]
    }) => memoApi.addActivity(memoId, { message, attachments }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: memoKeys.byId(vars.memoId) }),
  })
}

export function useUpdateMemoActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memoId, activityId, message }: {
      memoId: string; activityId: string; message: string
    }) => memoApi.updateActivity(memoId, activityId, message),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: memoKeys.byId(vars.memoId) }),
  })
}
