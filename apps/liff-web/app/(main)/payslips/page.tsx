import { Banknote } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

export default function PayslipsPage() {
  return (
    <>
      <PageHeader title="สลิปเงินเดือน" />
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <Banknote className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-base font-semibold">สลิปเงินเดือน</p>
        <p className="mt-1 text-sm text-muted-foreground">เร็วๆ นี้</p>
      </div>
    </>
  )
}
