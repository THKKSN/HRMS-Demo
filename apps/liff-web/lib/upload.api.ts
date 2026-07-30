import { api } from './api'

export type UploadResult = {
  uploadId?: string
  url: string
  fileName: string
  contentType: string
  sizeBytes: number
}

export async function uploadFile(file: File, module = 'general'): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  const endpoint = module === 'tickets' ? '/uploads/tickets' : '/uploads'
  const res = await api.post<UploadResult>(endpoint, form, {
    params: module === 'tickets' ? undefined : { module },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function uploadAttachment(file: File, module = 'general'): Promise<string> {
  return (await uploadFile(file, module)).url
}

export async function uploadLeaveAttachment(file: File): Promise<string> {
  return uploadAttachment(file, 'leaves')
}

export async function uploadTicketAttachment(file: File): Promise<string> {
  return uploadAttachment(file, 'tickets')
}

export async function uploadTicketFile(file: File): Promise<UploadResult> {
  return uploadFile(file, 'tickets')
}
