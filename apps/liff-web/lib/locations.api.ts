import { api } from './api'
import type { LocationDto } from '@hrms/shared-types'

export const locationsApi = {
  getMyCompanyLocations: () =>
    api.get<LocationDto[]>('/me/locations').then(r => r.data),
}
