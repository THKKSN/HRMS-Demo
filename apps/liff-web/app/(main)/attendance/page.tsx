import { Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

export default function AttendancePage() {
  return (
    <>
      <PageHeader title="ลงเวลา" />
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <Clock className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-base font-semibold">ระบบลงเวลา</p>
        <p className="mt-1 text-sm text-muted-foreground">เร็วๆ นี้</p>
      </div>
    </>
  )
}
