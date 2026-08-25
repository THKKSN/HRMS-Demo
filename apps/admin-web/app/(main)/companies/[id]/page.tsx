'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CompanyDto, CompanyTreeDto, OrgType } from '@hrms/shared-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DepartmentsManagementPage } from '@/components/departments/departments-management-page'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { useCompanies, useCompany, useUpdateCompany } from '@/hooks/use-companies'

const ORG_TYPE_LABEL: Record<OrgType, string> = {
  Holding: 'บริษัทหลัก',
  Subsidiary: 'บริษัทในเครือ',
  Branch: 'สาขา',
}

const ORG_TYPE_VARIANT: Record<OrgType, 'default' | 'secondary' | 'warning'> = {
  Holding: 'default',
  Subsidiary: 'secondary',
  Branch: 'warning',
}

const companySchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อบริษัท').max(200),
  nameEn: z.string().max(200).optional().or(z.literal('')),
  orgType: z.enum(['Holding', 'Subsidiary', 'Branch']),
  parentId: z.string().optional().or(z.literal('')),
  isHeadquarters: z.boolean(),
})

type CompanyFormValues = z.infer<typeof companySchema>

function flattenTree(nodes: CompanyTreeDto[]): CompanyDto[] {
  const result: CompanyDto[] = []
  function walk(list: CompanyTreeDto[]) {
    for (const n of list) {
      result.push({
        id: n.id,
        name: n.name,
        nameEn: n.nameEn,
        orgType: n.orgType,
        isActive: n.isActive,
        isHeadquarters: n.isHeadquarters,
        parentId: undefined,
        parentName: undefined,
      })
      walk(n.children)
    }
  }
  walk(nodes)
  return result
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-0.5">{message}</p>
}

function EditCompanyModal({
  company,
  onClose,
  allCompanies,
}: {
  company: CompanyDto
  onClose: () => void
  allCompanies: CompanyDto[]
}) {
  const update = useUpdateCompany()
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)

  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<CompanyFormValues>({
      resolver: zodResolver(companySchema),
      defaultValues: {
        name: company.name,
        nameEn: company.nameEn ?? '',
        orgType: company.orgType as OrgType,
        parentId: company.parentId ?? '',
        isHeadquarters: company.isHeadquarters,
      },
    })

  async function doUpdate(values: CompanyFormValues, isActive: boolean) {
    try {
      await update.mutateAsync({
        id: company.id,
        name: values.name,
        nameEn: values.nameEn || undefined,
        orgType: values.orgType,
        parentId: values.parentId || undefined,
        isActive,
        isHeadquarters: values.isHeadquarters,
      })
      toast.success('อัปเดตข้อมูลบริษัทสำเร็จ')
      setDeactivateConfirm(false)
      onClose()
    } catch (err: unknown) {
      const e = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (e === 'CIRCULAR_PARENT') setError('parentId', { message: 'ไม่สามารถตั้งบริษัทตัวเองเป็น parent ได้' })
      else if (e === 'HAS_ACTIVE_CHILDREN') toast.error('ไม่สามารถปิดได้ - มีบริษัทลูกที่ยังใช้งานอยู่')
      else { setError('root', { message: 'เกิดข้อผิดพลาด' }); toast.error('เกิดข้อผิดพลาด') }
    }
  }

  const otherCompanies = allCompanies.filter((c) => c.id !== company.id)

  return (
    <>
      <Modal open onClose={onClose} title={`แก้ไข - ${company.name}`}>
        <form onSubmit={handleSubmit((v) => doUpdate(v, company.isActive))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-name">ชื่อบริษัท (ภาษาไทย) *</Label>
            <Input id="company-name" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-name-en">ชื่อบริษัท (ภาษาอังกฤษ)</Label>
            <Input id="company-name-en" {...register('nameEn')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-org-type">ประเภทองค์กร *</Label>
            <Select id="company-org-type" {...register('orgType')}>
              <option value="Holding">บริษัทแม่ (Holding)</option>
              <option value="Subsidiary">บริษัทลูก (Subsidiary)</option>
              <option value="Branch">สาขา (Branch)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-parent">บริษัทแม่</Label>
            <Select id="company-parent" {...register('parentId')}>
              <option value="">ไม่มีบริษัทแม่</option>
              {otherCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <FieldError message={errors.parentId?.message} />
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
            <input type="checkbox" className="rounded border-border" {...register('isHeadquarters')} />
            <span>บริษัทสำนักงานใหญ่ (HQ)</span>
          </label>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant={company.isActive ? 'destructive' : 'ghost'}
              size="sm"
              onClick={() => company.isActive
                ? setDeactivateConfirm(true)
                : doUpdate(getValues(), true)}
              loading={update.isPending}
            >
              {company.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
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
        title="ปิดการใช้งานบริษัท"
        description={`ยืนยันปิดการใช้งาน "${company.name}"? บริษัทลูกทั้งหมดต้องถูกปิดก่อน`}
        confirmLabel="ปิดการใช้งาน"
        variant="destructive"
        loading={update.isPending}
      />
    </>
  )
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: company, isLoading, isError } = useCompany(id)
  const { data: tree = [] } = useCompanies(true)
  const [editOpen, setEditOpen] = useState(false)
  const allCompanies = flattenTree(tree).filter((item) => item.isActive)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-whited" />
        <div className="h-28 animate-pulse rounded-md bg-whited" />
        <div className="h-72 animate-pulse rounded-md bg-whited" />
      </div>
    )
  }

  if (isError || !company) {
    return (
      <div className="space-y-4">
        <Link href="/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> กลับ
        </Link>
        <div className="rounded-md border border-border bg-background p-6 text-sm text-destructive">
          ไม่พบข้อมูลบริษัทหรือโหลดข้อมูลไม่สำเร็จ
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> กลับ
      </Link>

      <section className="rounded-md border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
              {company.nameEn && <p className="mt-1 text-sm text-muted-foreground">{company.nameEn}</p>}
              {company.parentName && <p className="mt-1 text-sm text-muted-foreground">ภายใต้ {company.parentName}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={ORG_TYPE_VARIANT[company.orgType as OrgType]}>
              {ORG_TYPE_LABEL[company.orgType as OrgType]}
            </Badge>
            {company.isHeadquarters && <Badge variant="warning">HQ</Badge>}
            <Badge variant={company.isActive ? 'success' : 'secondary'}>
              {company.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> แก้ไขบริษัท
            </Button>
          </div>
        </div>
      </section>

      <DepartmentsManagementPage companyId={company.id} companyName={company.name} />

      {editOpen && (
        <EditCompanyModal
          company={company}
          onClose={() => setEditOpen(false)}
          allCompanies={allCompanies}
        />
      )}
    </div>
  )
}
