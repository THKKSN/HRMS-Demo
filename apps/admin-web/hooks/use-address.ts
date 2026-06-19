import { useQuery } from '@tanstack/react-query'
import { addressApi } from '@/lib/address.api'

export const addressKeys = {
  provinces: ['address', 'provinces'] as const,
  districts: (provinceId: number) => ['address', 'districts', provinceId] as const,
  subDistricts: (districtId: number) => ['address', 'subdistricts', districtId] as const,
  zipCode: (subDistrictId: number) => ['address', 'zipcode', subDistrictId] as const,
}

export function useProvinces() {
  return useQuery({
    queryKey: addressKeys.provinces,
    queryFn: addressApi.getProvinces,
    staleTime: Infinity,
  })
}

export function useDistricts(provinceId?: number) {
  return useQuery({
    queryKey: addressKeys.districts(provinceId ?? 0),
    queryFn: () => addressApi.getDistricts(provinceId!),
    enabled: !!provinceId,
    staleTime: Infinity,
  })
}

export function useSubDistricts(districtId?: number) {
  return useQuery({
    queryKey: addressKeys.subDistricts(districtId ?? 0),
    queryFn: () => addressApi.getSubDistricts(districtId!),
    enabled: !!districtId,
    staleTime: Infinity,
  })
}

export function useZipCode(subDistrictId?: number) {
  return useQuery({
    queryKey: addressKeys.zipCode(subDistrictId ?? 0),
    queryFn: () => addressApi.getZipCode(subDistrictId!),
    enabled: !!subDistrictId,
    staleTime: Infinity,
  })
}
