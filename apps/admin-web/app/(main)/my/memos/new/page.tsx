'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ChevronLeft, FileText } from 'lucide-react'
import { useCreateMemo, useMemoCategories, useMemoSubCategories, useMemoTypes } from '@/hooks/use-memo'

function apiMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
    ?? (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

export default function MyMemoNewPage() {
  const router = useRouter()
  const { data: memoTypes, isLoading: typesLoading } = useMemoTypes()
  const { mutateAsync: createMemo, isPending: isSubmitting } = useCreateMemo()

  const [memoTypeId, setMemoTypeId] = useState('')
  const [memoCategoryId, setMemoCategoryId] = useState('')
  const [memoSubCategoryId, setMemoSubCategoryId] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: categories, isLoading: categoriesLoading } = useMemoCategories(memoTypeId)
  const { data: subCategories, isLoading: subCategoriesLoading } = useMemoSubCategories(memoCategoryId)

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
    if (!canSubmit || isSubmitting) return
    setError(null)
    try {
      const result = await createMemo({ memoTypeId, memoCategoryId, memoSubCategoryId, detail: detail.trim() })
      router.replace(`/my/memos?created=${result.id}`)
    } catch (err) {
      setError(apiMessage(err))
    }
  }

  return (
    <div className="min-h-full bg-whited/40 p-4 lg:p-6">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/my/memos"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">ส่งบันทึกข้อความใหม่</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">เลือกประเภทเรื่องและกรอกรายละเอียด</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm space-y-4">
            <div className="mb-1 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">ประเภทเรื่อง</span>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">ประเภทเรื่อง</label>
              <select
                value={memoTypeId}
                onChange={(e) => handleTypeChange(e.target.value)}
                disabled={typesLoading}
                className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              >
                <option value="">{typesLoading ? 'กำลังโหลด...' : 'เลือกประเภทเรื่อง'}</option>
                {memoTypes?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">หมวดหมู่</label>
              <select
                value={memoCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={!memoTypeId || categoriesLoading}
                className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              >
                <option value="">
                  {!memoTypeId ? 'เลือกประเภทเรื่องก่อน' : categoriesLoading ? 'กำลังโหลด...' : 'เลือกหมวดหมู่'}
                </option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">หัวข้อย่อย</label>
              <select
                value={memoSubCategoryId}
                onChange={(e) => setMemoSubCategoryId(e.target.value)}
                disabled={!memoCategoryId || subCategoriesLoading}
                className="w-full rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              >
                <option value="">
                  {!memoCategoryId ? 'เลือกหมวดหมู่ก่อน' : subCategoriesLoading ? 'กำลังโหลด...' : 'เลือกหัวข้อย่อย'}
                </option>
                {subCategories?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">รายละเอียด</span>
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={6}
              maxLength={4000}
              placeholder="อธิบายรายละเอียดเรื่องที่ต้องการแจ้ง..."
              className="w-full resize-none rounded-xl border border-border bg-whited px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mt-1 flex justify-end">
              <span className="text-xs text-muted-foreground">{detail.length}/4000</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60 transition-opacity"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                กำลังส่งเรื่อง...
              </span>
            ) : 'ส่งบันทึกข้อความ'}
          </button>
        </form>
      </div>
    </div>
  )
}
