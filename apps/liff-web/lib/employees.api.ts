import { api } from './api'
import type { EmployeeProfileDto } from '@hrms/shared-types'

export const employeesApi = {
  getMe: () =>
    api.get<EmployeeProfileDto>('/employees/me').then(r => r.data),
}
