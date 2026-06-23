import { useQuery } from '@tanstack/react-query'
import { holidaysApi } from '@/lib/holidays.api'

export function useMyHolidays(year: number) {
  return useQuery({
    queryKey: ['holidays', year],
    queryFn: () => holidaysApi.getByYear(year),
    staleTime: 60 * 60 * 1000,
  })
}
