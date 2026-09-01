'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronLeft, FileText, Loader2, Send } from 'lucide-react'
import { useCreateMemo, useMemoCategories, useMemoSubCategories, useMemoTypes } from '@/hooks/use-memo'

function apiMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: string; errors?: string[]; error?: string } } })?.response?.data
  return data?.message ?? data?.errors?.[0] ?? data?.error ?? 'ไม่สามารถส่งเรื่องได้ กรุณาลองใหม่'
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:disabled:bg-slate-900"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

export default function NewMemoPage() {
  const { data: memoTypes, isLoading: typesLoading } = useMemoTypes()
  const { mutateAsync: createMemo } = useCreateMemo()

  const [memoTypeId, setMemoTypeId] = useState('')
  const [memoCategoryId, setMemoCategoryId] = useState('')
  const [memoSubCategoryId, setMemoSubCategoryId] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: categories, isLoading: categoriesLoading } = useMemoCategories(memoTypeId)
  const { data: subCategories, isLoading: subCategoriesLoading } = useMemoSubCategories(memoCategoryId)

  const selectedType = memoTypes?.find(t => t.id === memoTypeId)
  const selectedCategory = categories?.find(c => c.id === memoCategoryId)
  const selectedSubCategory = subCategories?.find(s => s.id === memoSubCategoryId)

  const canSubmit = !!memoTypeId && !!memoCategoryId && !!memoSubCategoryId && detail.trim().length > 0

  function handleTypeChange(nextTypeId: string) {
    setMemoTypeId(nextTypeId)
    setMemoCategoryId('')
    setMemoSubCategoryId('')
  }

  function handleCategoryChange(nextCategoryId: string) {
    setMemoCategoryId(nextCategoryId)
    setMemoSubCategoryId('')
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setError(null)
    setSubmitting(true)
    try {
      const result = await createMemo({ memoTypeId, memoCategoryId, memoSubCategoryId, detail: detail.trim() })
      setCreated({ id: result.id })
    } catch (err) {
      setError(apiMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="min-h-screen bg-indigo-50/60 dark:bg-slate-950">
        <div className="bg-indigo-600 px-4 pb-6 pt-4 text-white">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">ส่งบันทึกข้อความแล้ว</h1>
              <p className="text-xs text-white/75">ระบบรับเรื่องเรียบร้อย รอผู้บริหารอนุมัติ</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">ประเภทเรื่อง:</span> {selectedType?.name}</p>
              <p><span className="text-muted-foreground">หมวดหมู่:</span> {selectedCategory?.name} / {selectedSubCategory?.name}</p>
              <p><span className="text-muted-foreground">สถานะ:</span> รออนุมัติ</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/memos/my" className="flex h-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white">
                ดูรายการทั้งหมด
              </Link>
              <Link href="/" className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold dark:border-slate-600 dark:text-slate-100">
                กลับหน้าแรก
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-50/60 dark:bg-slate-950">
      <div className="bg-indigo-600 px-4 pb-5 pt-4 text-white">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">ขอ Memo</h1>
            <p className="text-xs text-white/75">เลือกประเภทเรื่องและกรอกรายละเอียด</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 pb-28 pt-3">
        {error && (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold">ประเภทเรื่อง</span>
          </div>

          <div className="space-y-3">
            <SelectField
              label="ประเภทเรื่อง"
              value={memoTypeId}
              onChange={handleTypeChange}
              disabled={typesLoading}
              placeholder={typesLoading ? 'กำลังโหลด...' : 'เลือกประเภทเรื่อง'}
              options={(memoTypes ?? []).map(t => ({ value: t.id, label: t.name }))}
            />

            <SelectField
              label="หมวดหมู่"
              value={memoCategoryId}
              onChange={handleCategoryChange}
              disabled={!memoTypeId || categoriesLoading}
              placeholder={!memoTypeId ? 'เลือกประเภทเรื่องก่อน' : categoriesLoading ? 'กำลังโหลด...' : 'เลือกหมวดหมู่'}
              options={(categories ?? []).map(c => ({ value: c.id, label: c.name }))}
            />

            <SelectField
              label="หัวข้อย่อย"
              value={memoSubCategoryId}
              onChange={setMemoSubCategoryId}
              disabled={!memoCategoryId || subCategoriesLoading}
              placeholder={!memoCategoryId ? 'เลือกหมวดหมู่ก่อน' : subCategoriesLoading ? 'กำลังโหลด...' : 'เลือกหัวข้อย่อย'}
              options={(subCategories ?? []).map(s => ({ value: s.id, label: s.name }))}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold">รายละเอียด</span>
          </div>

          <label className="block">
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="อธิบายรายละเอียดเรื่องที่ต้องการแจ้ง"
              maxLength={4000}
              rows={6}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <div className="mt-1 flex justify-end">
            <span className="text-xs text-muted-foreground">{detail.length}/4000</span>
          </div>
        </section>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="fixed bottom-20 left-1/2 flex h-12 w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg disabled:bg-slate-300"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          ส่งบันทึกข้อความ
        </button>
      </form>
    </div>
  )
}
