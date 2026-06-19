'use client'

import { useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useProvinces, useDistricts, useSubDistricts, useZipCode } from '@/hooks/use-address'

export type AddressValue = {
  provinceId?: number
  districtId?: number
  subDistrictId?: number
  zipCode?: string
}

type Props = {
  value: AddressValue
  onChange: (v: AddressValue) => void
  disabled?: boolean
}

export function AddressSelector({ value, onChange, disabled }: Props) {
  const { data: provinces = [], isLoading: loadingProvinces } = useProvinces()
  const { data: districts = [], isLoading: loadingDistricts } = useDistricts(value.provinceId)
  const { data: subDistricts = [], isLoading: loadingSubs } = useSubDistricts(value.districtId)
  const { data: zipCode } = useZipCode(value.subDistrictId)

  // auto-fill zipcode when subDistrict resolves
  useEffect(() => {
    if (zipCode !== undefined && zipCode !== value.zipCode) {
      onChange({ ...value, zipCode: zipCode ?? undefined })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode])

  function handleProvince(provinceId: number | undefined) {
    onChange({ provinceId, districtId: undefined, subDistrictId: undefined, zipCode: undefined })
  }

  function handleDistrict(districtId: number | undefined) {
    onChange({ ...value, districtId, subDistrictId: undefined, zipCode: undefined })
  }

  function handleSubDistrict(subDistrictId: number | undefined) {
    onChange({ ...value, subDistrictId, zipCode: undefined })
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Province */}
      <div className="space-y-1.5">
        <Label>จังหวัด</Label>
        <Select
          value={value.provinceId ?? ''}
          onChange={(e) =>
            handleProvince(e.target.value ? Number(e.target.value) : undefined)
          }
          disabled={disabled || loadingProvinces}
        >
          <option value="">— เลือกจังหวัด —</option>
          {provinces.map((p) => (
            <option key={p.provinceId} value={p.provinceId}>
              {p.provinceName}
            </option>
          ))}
        </Select>
      </div>

      {/* District */}
      <div className="space-y-1.5">
        <Label>อำเภอ / เขต</Label>
        <Select
          value={value.districtId ?? ''}
          onChange={(e) =>
            handleDistrict(e.target.value ? Number(e.target.value) : undefined)
          }
          disabled={disabled || !value.provinceId || loadingDistricts}
        >
          <option value="">— เลือกอำเภอ —</option>
          {districts.map((d) => (
            <option key={d.districtId} value={d.districtId}>
              {d.districtName}
            </option>
          ))}
        </Select>
      </div>

      {/* SubDistrict */}
      <div className="space-y-1.5">
        <Label>ตำบล / แขวง</Label>
        <Select
          value={value.subDistrictId ?? ''}
          onChange={(e) =>
            handleSubDistrict(e.target.value ? Number(e.target.value) : undefined)
          }
          disabled={disabled || !value.districtId || loadingSubs}
        >
          <option value="">— เลือกตำบล —</option>
          {subDistricts.map((s) => (
            <option key={s.subDistrictId} value={s.subDistrictId}>
              {s.subDistrictName}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}
