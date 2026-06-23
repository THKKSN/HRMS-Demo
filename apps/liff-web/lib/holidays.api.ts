import { api } from './api'
import type { HolidayDto } from '@hrms/shared-types'

export const holidaysApi = {
  getByYear: (year: number) =>
    api.get<HolidayDto[]>('/holidays', { params: { year } }).then(r => r.data),
}
