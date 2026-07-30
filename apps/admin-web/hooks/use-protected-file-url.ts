'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { publicFileUrl } from '@/lib/public-file-url'

export function useProtectedFileUrl(value: string) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!value.startsWith('/tickets/')) {
      setUrl(publicFileUrl(value))
      return
    }

    let objectUrl: string | undefined
    let active = true
    api.get<Blob>(value, { responseType: 'blob' }).then(response => {
      if (!active) return
      objectUrl = URL.createObjectURL(response.data)
      setUrl(objectUrl)
    }).catch(() => {
      if (active) setUrl(undefined)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [value])

  return url
}
