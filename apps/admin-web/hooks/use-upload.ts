import { useState } from 'react'
import { uploadApi, type UploadModule, type UploadResult } from '@/lib/upload.api'

export type UploadState = {
  isUploading: boolean
  error: string | null
  result: UploadResult | null
}

export function useUpload(module: UploadModule = 'general') {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    error: null,
    result: null,
  })

  async function upload(file: File): Promise<UploadResult | null> {
    setState({ isUploading: true, error: null, result: null })
    try {
      const result = await uploadApi.upload(file, module)
      setState({ isUploading: false, error: null, result })
      return result
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'อัปโหลดไม่สำเร็จ'
      setState({ isUploading: false, error: msg, result: null })
      return null
    }
  }

  function reset() {
    setState({ isUploading: false, error: null, result: null })
  }

  return { ...state, upload, reset }
}
