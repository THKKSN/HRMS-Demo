'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EmployeeProfileDto } from '@hrms/shared-types'

async function fetchProfile(): Promise<EmployeeProfileDto> {
  const res = await api.get<EmployeeProfileDto>('/employees/me')
  return res.data
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
  })
}
