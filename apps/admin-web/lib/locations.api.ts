import { api } from './api'
import type { LocationDto } from '@hrms/shared-types'

export const locationsApi = {
  getAll: (companyId?: string, includeInactive = false) =>
    api
      .get<LocationDto[]>('/locations', { params: { companyId, includeInactive } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<LocationDto>(`/locations/${id}`).then((r) => r.data),

  create: (body: {
    companyId: string
    name: string
    latitude: number
    longitude: number
    radiusMeters: number
    address?: string
    provinceId?: number
    districtId?: number
    subDistrictId?: number
  }) => api.post<LocationDto>('/locations', body).then((r) => r.data),

  update: (
    id: string,
    body: {
      name: string
      latitude: number
      longitude: number
      radiusMeters: number
      address?: string
      provinceId?: number
      districtId?: number
      subDistrictId?: number
      isActive: boolean
    },
  ) => api.put<LocationDto>(`/locations/${id}`, body).then((r) => r.data),
}
