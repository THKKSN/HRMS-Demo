'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCard, Hash, Loader2 } from 'lucide-react'
import { useLiffContext } from '@/components/providers/liff-provider'
import { liff } from '@/lib/liff'
import { api } from '@/lib/api'
import type { ApiError } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

const schema = z.object({
  employeeCode: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  nationalId: z
    .string()
    .regex(/^\d{13}$/, 'เลขบัตรประชาชน 13 หลัก ตัวเลขเท่านั้น'),
})
type FormValues = z.infer<typeof schema>

function LinkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''
  const { isReady, isLoggedIn } = useLiffContext()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // ── Loading state ────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      </div>
    )
  }

  // ── ยังไม่ได้ login LINE ─────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">กรุณาเข้าสู่ระบบด้วย LINE</p>
          <p className="text-sm text-muted-foreground">เพื่อเริ่มต้นผูกบัญชีกับระบบ HRMS</p>
        </div>
        <button
          onClick={() => liff.login({ redirectUri: window.location.href })}
          className="flex w-full max-w-xs items-center justify-center gap-2.5 rounded-2xl bg-[#06C755] py-3.5 text-sm font-bold text-white shadow-sm shadow-green-500/30 transition-opacity hover:opacity-90"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.02 2 11c0 3.28 1.85 6.16 4.65 7.88l-.65 2.62L8.96 20C9.93 20.32 10.95 20.5 12 20.5c5.52 0 10-4.02 10-9S17.52 2 12 2z"/>
          </svg>
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>
    )
  }

  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null)
    try {
      const accessToken = liff.getAccessToken()
      if (!accessToken) throw new Error('ไม่พบ LINE access token กรุณาเปิดในแอป LINE')

      await api.post('/auth/otp/request', {
        accessToken,
        employeeCode: values.employeeCode,
        nationalId: values.nationalId,
      })

      sessionStorage.setItem('liff_access_token', accessToken)
      router.push(next ? `/auth/otp?next=${encodeURIComponent(next)}` : '/auth/otp')
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined
        if (err.response?.status === 409) {
          sessionStorage.setItem('liff_access_token', liff.getAccessToken() ?? '')
          router.push(
            next ? `/auth/already-linked?next=${encodeURIComponent(next)}` : '/auth/already-linked',
          )
          return
        }
        setErrorMsg(data?.message ?? 'ไม่พบข้อมูลพนักงาน กรุณาตรวจสอบข้อมูล')
      } else if (err instanceof Error) {
        setErrorMsg(err.message)
      }
    }
  }

  // ── Form ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col px-6 py-8">
      {/* Page heading */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">ผูกบัญชี LINE</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          กรอกข้อมูลพนักงานเพื่อผูกบัญชีกับระบบ HRMS
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Employee code */}
        <div className="space-y-1.5">
          <label htmlFor="employeeCode" className="text-sm font-medium text-foreground">
            รหัสพนักงาน
          </label>
          <div className="relative">
            <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="employeeCode"
              type="text"
              autoComplete="off"
              placeholder="เช่น EMP001"
              className={`w-full rounded-xl border bg-whited py-3 pl-10 pr-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.employeeCode ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
              {...register('employeeCode')}
            />
          </div>
          {errors.employeeCode && (
            <p className="text-xs text-destructive">{errors.employeeCode.message}</p>
          )}
        </div>

        {/* National ID */}
        <div className="space-y-1.5">
          <label htmlFor="nationalId" className="text-sm font-medium text-foreground">
            เลขบัตรประชาชน
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="nationalId"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={13}
              placeholder="X-XXXX-XXXXX-XX-X"
              className={`w-full rounded-xl border bg-whited py-3 pl-10 pr-4 text-sm tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.nationalId ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
              {...register('nationalId')}
            />
          </div>
          {errors.nationalId && (
            <p className="text-xs text-destructive">{errors.nationalId.message}</p>
          )}
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังยืนยัน...
            </>
          ) : (
            'ดำเนินการต่อ →'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        ข้อมูลของคุณถูกเข้ารหัสและความปลอดภัย
      </p>
    </div>
  )
}

export default function LinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <LinkContent />
    </Suspense>
  )
}
