import { useQuery } from '@tanstack/react-query'
import { locationsApi } from '@/lib/locations.api'

export function useMyCompanyLocations() {
  return useQuery({
    queryKey: ['locations', 'my-company'],
    queryFn: locationsApi.getMyCompanyLocations,
    staleTime: 5 * 60_000,
  })
}
