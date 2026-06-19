'use client'

import { useState } from 'react'
import { Plus, Pencil, Navigation } from 'lucide-react'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { AddressSelector } from '@/components/shared/address-selector'
import { useCompanies } from '@/hooks/use-companies'
import { useLocations, useCreateLocation, useUpdateLocation } from '@/hooks/use-locations'
import type { LocationDto } from '@hrms/shared-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

function flattenActiveCompanies(tree: { id: string; name: string; isActive: boolean; children: typeof tree }[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = []
  function walk(nodes: typeof tree) {
    for (const n of nodes) {
      if (n.isActive) result.push({ id: n.id, name: n.name })
      walk(n.children)
    }
  }
  walk(tree)
  return result
}

// ── Schema ────────────────────────────────────────────────────────────────────

const locationSchema = z.object({
  companyId:    z.string().min(1, 'กรุณาเลือกบริษัท'),
  name:         z.string().min(1, 'กรุณากรอกชื่อสถานที่').max(200),
  latitude:     z.number().min(-90, 'ต้องอยู่ระหว่าง -90 ถึง 90').max(90, 'ต้องอยู่ระหว่าง -90 ถึง 90'),
  longitude:    z.number().min(-180, 'ต้องอยู่ระหว่าง -180 ถึง 180').max(180, 'ต้องอยู่ระหว่าง -180 ถึง 180'),
  radiusMeters: z.number().min(10, 'ขั้นต่ำ 10 เมตร').max(5000, 'สูงสุด 5,000 เมตร'),
  address:      z.string().max(500).optional().or(z.literal('')),
  provinceId:   z.number().optional(),
  districtId:   z.number().optional(),
  subDistrictId: z.number().optional(),
})

type LocationFormValues = z.infer<typeof locationSchema>

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateLocationModal({
  open,
  onClose,
  defaultCompanyId,
  companies,
}: {
  open: boolean
  onClose: () => void
  defaultCompanyId?: string
  companies: { id: string; name: string }[]
}) {
  const create = useCreateLocation()
  const { register, handleSubmit, setError, reset, control, setValue, formState: { errors, isSubmitting } } =
    useForm<LocationFormValues>({
      resolver: zodResolver(locationSchema),
      defaultValues: { companyId: defaultCompanyId ?? '', radiusMeters: 100 },
    })

  function useCurrentPosition() {
    if (!navigator.geolocation) {
      toast.error('เบราว์เซอร์นี้ไม่รองรับ Geolocation')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude',  parseFloat(pos.coords.latitude.toFixed(6)))
        setValue('longitude', parseFloat(pos.coords.longitude.toFixed(6)))
        toast.success('ดึงพิกัดปัจจุบันสำเร็จ')
      },
      () => toast.error('ไม่สามารถดึงพิกัดได้'),
    )
  }

  async function onSubmit(values: LocationFormValues) {
    try {
      await create.mutateAsync({
        companyId:     values.companyId,
        name:          values.name,
        latitude:      values.latitude,
        longitude:     values.longitude,
        radiusMeters:  values.radiusMeters,
        address:       values.address || undefined,
        provinceId:    values.provinceId,
        districtId:    values.districtId,
        subDistrictId: values.subDistrictId,
      })
      toast.success(`เพิ่มสถานที่ "${values.name}" สำเร็จ`)
      reset({ companyId: defaultCompanyId ?? '', radiusMeters: 100 })
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_LOCATION') setError('name', { message: 'มีสถานที่ชื่อนี้อยู่แล้วในบริษัทนี้' })
      else if (e === 'COMPANY_NOT_FOUND') setError('companyId', { message: 'ไม่พบบริษัทที่ระบุ' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="เพิ่มสถานที่ใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Company */}
        <div className="space-y-1.5">
          <Label htmlFor="cl-company">บริษัท *</Label>
          <Select id="cl-company" {...register('companyId')}>
            <option value="">— เลือกบริษัท —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <FieldError message={errors.companyId?.message} />
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="cl-name">ชื่อสถานที่ *</Label>
          <Input id="cl-name" {...register('name')} placeholder="สำนักงานใหญ่" />
          <FieldError message={errors.name?.message} />
        </div>

        {/* Lat / Lng */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cl-lat">Latitude *</Label>
            <Input id="cl-lat" type="number" step="any" {...register('latitude', { valueAsNumber: true })} placeholder="13.756331" />
            <FieldError message={errors.latitude?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-lng">Longitude *</Label>
            <Input id="cl-lng" type="number" step="any" {...register('longitude', { valueAsNumber: true })} placeholder="100.501762" />
            <FieldError message={errors.longitude?.message} />
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={useCurrentPosition}>
          <Navigation className="h-3.5 w-3.5" />ใช้พิกัดปัจจุบัน
        </Button>

        {/* Radius */}
        <div className="space-y-1.5">
          <Label htmlFor="cl-radius">รัศมี (เมตร) *</Label>
          <Input id="cl-radius" type="number" {...register('radiusMeters', { valueAsNumber: true })} placeholder="100" />
          <FieldError message={errors.radiusMeters?.message} />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="cl-addr">ที่อยู่</Label>
          <Input id="cl-addr" {...register('address')} placeholder="เลขที่ ถนน ..." />
        </div>

        {/* Address Selector */}
        <Controller
          control={control}
          name="provinceId"
          render={({ field: { value } }) => (
            <AddressSelector
              value={{
                provinceId:    value,
                districtId:    undefined,
                subDistrictId: undefined,
              }}
              onChange={(v) => {
                setValue('provinceId',    v.provinceId)
                setValue('districtId',   v.districtId)
                setValue('subDistrictId', v.subDistrictId)
              }}
            />
          )}
        />

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>ยกเลิก</Button>
          <Button type="submit" loading={isSubmitting}>บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

const editLocationSchema = locationSchema.omit({ companyId: true })
type EditLocationFormValues = z.infer<typeof editLocationSchema>

function EditLocationModal({
  location,
  onClose,
}: {
  location: LocationDto
  onClose: () => void
}) {
  const update = useUpdateLocation()
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)

  const { register, handleSubmit, setError, getValues, control, setValue, formState: { errors, isSubmitting, isDirty } } =
    useForm<EditLocationFormValues>({
      resolver: zodResolver(editLocationSchema),
      defaultValues: {
        name:          location.name,
        latitude:      location.latitude,
        longitude:     location.longitude,
        radiusMeters:  location.radiusMeters,
        address:       location.address ?? '',
        provinceId:    location.provinceId,
        districtId:    location.districtId,
        subDistrictId: location.subDistrictId,
      },
    })

  function useCurrentPosition() {
    if (!navigator.geolocation) { toast.error('เบราว์เซอร์นี้ไม่รองรับ Geolocation'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude',  parseFloat(pos.coords.latitude.toFixed(6)))
        setValue('longitude', parseFloat(pos.coords.longitude.toFixed(6)))
        toast.success('ดึงพิกัดปัจจุบันสำเร็จ')
      },
      () => toast.error('ไม่สามารถดึงพิกัดได้'),
    )
  }

  async function doUpdate(values: EditLocationFormValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id:            location.id,
        name:          values.name,
        latitude:      values.latitude,
        longitude:     values.longitude,
        radiusMeters:  values.radiusMeters,
        address:       values.address || undefined,
        provinceId:    values.provinceId,
        districtId:    values.districtId,
        subDistrictId: values.subDistrictId,
        isActive,
      })
      toast.success('อัปเดตสถานที่สำเร็จ')
      setDeactivateConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'DUPLICATE_LOCATION') setError('name', { message: 'มีสถานที่ชื่อนี้อยู่แล้วในบริษัทนี้' })
      else { setError('root', { message: 'เกิดข้อผิดพลาด' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title={`แก้ไข — ${location.name}`}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, location.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="el-name">ชื่อสถานที่ *</Label>
            <Input id="el-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="el-lat">Latitude *</Label>
              <Input id="el-lat" type="number" step="any" {...register('latitude', { valueAsNumber: true })} />
              <FieldError message={errors.latitude?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="el-lng">Longitude *</Label>
              <Input id="el-lng" type="number" step="any" {...register('longitude', { valueAsNumber: true })} />
              <FieldError message={errors.longitude?.message} />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={useCurrentPosition}>
            <Navigation className="h-3.5 w-3.5" />ใช้พิกัดปัจจุบัน
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="el-radius">รัศมี (เมตร) *</Label>
            <Input id="el-radius" type="number" {...register('radiusMeters', { valueAsNumber: true })} />
            <FieldError message={errors.radiusMeters?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="el-addr">ที่อยู่</Label>
            <Input id="el-addr" {...register('address')} />
          </div>

          <Controller
            control={control}
            name="provinceId"
            render={({ field: { value } }) => (
              <AddressSelector
                value={{
                  provinceId:    value,
                  districtId:    getValues('districtId'),
                  subDistrictId: getValues('subDistrictId'),
                }}
                onChange={(v) => {
                  setValue('provinceId',    v.provinceId,    { shouldDirty: true })
                  setValue('districtId',   v.districtId,   { shouldDirty: true })
                  setValue('subDistrictId', v.subDistrictId, { shouldDirty: true })
                }}
              />
            )}
          />

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant={location.isActive ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() => location.isActive ? setDeactivateConfirm(true) : doUpdate(getValues(), true)}
              loading={update.isPending}
            >
              {location.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>บันทึก</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deactivateConfirm}
        onClose={() => setDeactivateConfirm(false)}
        onConfirm={() => doUpdate(getValues(), false)}
        title="ปิดการใช้งานสถานที่"
        description={`ยืนยันปิดการใช้งาน "${location.name}"?`}
        confirmLabel="ปิดการใช้งาน"
        variant="destructive"
        loading={update.isPending}
      />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const [companyFilter, setCompanyFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LocationDto | null>(null)

  const { data: tree = [] } = useCompanies()
  const { data: locations = [], isLoading } = useLocations(companyFilter || undefined, showInactive)

  const companies = flattenActiveCompanies(tree)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">สถานที่เช็คอิน</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />เพิ่มสถานที่
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-56"
        >
          <option value="">— ทุกบริษัท —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          แสดงปิดใช้งาน
        </label>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อสถานที่</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">พิกัด</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รัศมี</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">จังหวัด</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : locations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  {companyFilter ? 'ไม่พบสถานที่ในบริษัทนี้' : 'ยังไม่มีสถานที่'}
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className={loc.isActive ? 'text-foreground font-medium' : 'text-muted-foreground line-through'}>
                      {loc.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {companies.find((c) => c.id === loc.companyId)?.name ?? loc.companyId}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.radiusMeters} ม.
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.provinceName ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={loc.isActive ? 'success' : 'secondary'}>
                      {loc.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditTarget(loc)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateLocationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultCompanyId={companyFilter || undefined}
        companies={companies}
      />

      {editTarget && (
        <EditLocationModal location={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}

