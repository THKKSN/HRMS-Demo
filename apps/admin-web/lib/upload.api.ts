import { api } from './api'

export type UploadResult = {
  uploadId?: string
  key?: string
  url: string
  fileName: string
  contentType: string
  sizeBytes: number
}

export type UploadModule = 'leaves' | 'payslips' | 'tickets' | 'general'

export const uploadApi = {
  upload: async (file: File, module: UploadModule = 'general'): Promise<UploadResult> => {
    const form = new FormData()
    form.append('file', file)
    const endpoint = module === 'tickets' ? '/uploads/tickets' : `/uploads?module=${module}`
    const res = await api.post<UploadResult>(endpoint, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  delete: (key: string) =>
    api.delete(`/uploads?key=${encodeURIComponent(key)}`),
}
