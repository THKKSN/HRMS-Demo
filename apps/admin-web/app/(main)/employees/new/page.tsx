'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmployeeCreateForm } from '../employee-create-form'

function NewEmployeePage() {
  const t = useTranslations('admin.employees.create')
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCompanyId = searchParams.get('companyId') ?? undefined

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <Link href="/employees">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="h-4 w-4" />{t('backToList')}
          </Button>
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-foreground">{t('pageTitle')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t('pageHint')}
        </p>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-background p-5 sm:p-6">
        <EmployeeCreateForm
          defaultCompanyId={defaultCompanyId}
          onSuccess={(id) => router.push(`/employees/${id}`)}
          onCancel={() => router.push('/employees')}
        />
      </div>
    </div>
  )
}

export default function NewEmployeePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <NewEmployeePage />
    </Suspense>
  )
}
