import { Banknote } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/layout/page-header'

export default async function PayslipsPage() {
  const t = await getTranslations('liff.payslip')
  const tCommon = await getTranslations('common')
  return (
    <>
      <PageHeader title={t('title')} />
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <Banknote className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-base font-semibold">{t('title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tCommon('state.comingSoon')}</p>
      </div>
    </>
  )
}
