import { api } from './api'
import type { ProvinceDto, DistrictDto, SubDistrictDto } from '@hrms/shared-types'

export const addressApi = {
  getProvinces: () =>
    api.get<ProvinceDto[]>('/address/provinces').then((r) => r.data),

  getDistricts: (provinceId: number) =>
    api
      .get<DistrictDto[]>('/address/districts', { params: { provinceId } })
      .then((r) => r.data),

  getSubDistricts: (districtId: number) =>
    api
      .get<SubDistrictDto[]>('/address/subdistricts', { params: { districtId } })
      .then((r) => r.data),

  getZipCode: (subDistrictId: number) =>
    api
      .get<{ zipCode: string | null }>('/address/zipcode', { params: { subDistrictId } })
      .then((r) => r.data.zipCode),
}
