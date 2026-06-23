'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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

export default function LinkPage() {
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

  // DEBUG: แสดง LINE access token (ลบออกหลังทดสอบ)
  const debugToken = isReady ? liff.getAccessToken() : null

  // ถ้า LIFF ยังไม่ init → แสดง loading
  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // external browser และยังไม่ได้ login → แสดงปุ่ม
  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground text-center">
          กรุณาเข้าสู่ระบบด้วย LINE เพื่อดำเนินการต่อ
        </p>
        <button
          onClick={() => liff.login({ redirectUri: window.location.href })}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-4 py-3 text-sm font-semibold text-white"
        >
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>
    )
  }

  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null)
    try {
      // ดึง LINE access token จาก LIFF
      const accessToken = liff.getAccessToken()
      if (!accessToken) throw new Error('ไม่พบ LINE access token กรุณาเปิดในแอป LINE')

      await api.post('/auth/otp/request', {
        accessToken,
        employeeCode: values.employeeCode,
        nationalId: values.nationalId,
      })

      // เก็บ access token ชั่วคราวไว้ใช้หน้า OTP
      sessionStorage.setItem('liff_access_token', accessToken)
      router.push(next ? `/auth/otp?next=${encodeURIComponent(next)}` : '/auth/otp')
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined
        if (err.response?.status === 409) {
          // ผูกแล้ว → ไปหน้า already-linked
          sessionStorage.setItem('liff_access_token', liff.getAccessToken() ?? '')
          router.push(next ? `/auth/already-linked?next=${encodeURIComponent(next)}` : '/auth/already-linked')
          return
        }
        setErrorMsg(data?.message ?? 'ไม่พบข้อมูลพนักงาน กรุณาตรวจสอบข้อมูล')
      } else if (err instanceof Error) {
        setErrorMsg(err.message)
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-8">
      {/* DEBUG TOKEN — ลบออกหลังทดสอบ */}
      {/* {debugToken && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs break-all">
          <p className="font-bold text-yellow-800 mb-1">LINE Token (debug):</p>
          <p className="text-yellow-700 select-all">{debugToken}</p>
        </div>
      )} */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">ผูกบัญชี LINE</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          กรอกข้อมูลพนักงานเพื่อผูกบัญชี LINE กับระบบ HRMS
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="employeeCode" className="text-sm font-medium">
            รหัสพนักงาน
          </label>
          <input
            id="employeeCode"
            type="text"
            autoComplete="off"
            placeholder="เช่น EMP001"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('employeeCode')}
          />
          {errors.employeeCode && (
            <p className="text-xs text-destructive">{errors.employeeCode.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="nationalId" className="text-sm font-medium">
            เลขบัตรประชาชน
          </label>
          <input
            id="nationalId"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={13}
            placeholder="X-XXXX-XXXXX-XX-X"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('nationalId')}
          />
          {errors.nationalId && (
            <p className="text-xs text-destructive">{errors.nationalId.message}</p>
          )}
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  )
}
