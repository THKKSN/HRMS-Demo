import { useQuery } from '@tanstack/react-query'
import { employeesApi } from '@/lib/employees.api'

export function useMe() {
  return useQuery({
    queryKey: ['employees', 'me'],
    queryFn: employeesApi.getMe,
    staleTime: 5 * 60 * 1000,
  })
}
