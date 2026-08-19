'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Hash, Loader2, User, X } from 'lucide-react'
import { useLiffContext } from '@/components/providers/liff-provider'
import { buildLiffUrl, getLiffAccessToken, liff } from '@/lib/liff'
import { buildLinkPreviewPayload, buildOtpRequestPayload } from '@/lib/auth-link'
import { api } from '@/lib/api'
import type { ApiError } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

const LINE_LOGIN_QUERY_KEYS = [
  'code',
  'state',
  'liff.state',
  'liff.referrer',
  'friendship_status_changed',
  'error',
  'error_description',
]

const schema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกรหัสพนักงาน')
    .max(50, 'รหัสพนักงานต้องไม่เกิน 50 ตัวอักษร'),
})
type FormValues = z.infer<typeof schema>

/** ผลจาก /auth/link/preview — เก็บใน React state เท่านั้น ห้ามลง storage หรือ URL */
type LinkPreview = {
  fullName: string
  previewToken: string
  expiresIn: number
}

function getLineLoginRedirectUri() {
  const url = new URL('/auth/link', window.location.origin)
  const next = new URLSearchParams(window.location.search).get('next')
  if (next) {
    url.searchParams.set('next', next)
  }

  LINE_LOGIN_QUERY_KEYS.forEach((key) => url.searchParams.delete(key))
  return url.toString()
}

function openLineLogin() {
  const redirectUri = getLineLoginRedirectUri()

  if (!liff.isInClient()) {
    const current = new URL(redirectUri)
    window.location.href = buildLiffUrl(`${current.pathname}${current.search}`)
    return
  }

  liff.login({ redirectUri })
}

function LinkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''
  const { isReady, isLoggedIn, error } = useLiffContext()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
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

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">ไม่สามารถเริ่ม LINE OAuth ได้</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <p className="max-w-sm rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          กรุณาเปิดผ่าน LIFF URL ของระบบ TBG Assistant หรือเช็คว่า LIFF Endpoint URL ใน LINE Developers
          ตรงกับโดเมนปัจจุบัน
        </p>
      </div>
    )
  }

  // ── ยังไม่ได้ login LINE ─────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">กรุณาเข้าสู่ระบบด้วย LINE</p>
          <p className="text-sm text-muted-foreground">เพื่อเริ่มต้นผูกบัญชีกับระบบ TBG Assistant</p>
        </div>
        <button
          onClick={openLineLogin}
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

  const goToAlreadyLinked = (accessToken: string) => {
    sessionStorage.setItem('liff_access_token', accessToken)
    router.push(
      next ? `/auth/already-linked?next=${encodeURIComponent(next)}` : '/auth/already-linked',
    )
  }

  /** ขั้นแรก: ขอดูชื่อพนักงาน ยังไม่ส่ง OTP */
  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null)
    try {
      const accessToken = getLiffAccessToken()
      if (!accessToken) throw new Error('ไม่พบ LINE access token กรุณาเปิดในแอป LINE')

      const response = await api.post<LinkPreview>(
        '/auth/link/preview',
        buildLinkPreviewPayload(accessToken, values.employeeCode),
      )
      setPreview(response.data)
    } catch (err) {
      setPreview(null)
      if (isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined
        if (err.response?.status === 409) {
          goToAlreadyLinked(getLiffAccessToken() ?? '')
          return
        }
        setErrorMsg(data?.message ?? 'กรุณาตรวจสอบรหัสพนักงานใหม่อีกครั้ง')
      } else if (err instanceof Error) {
        setErrorMsg(err.message)
      }
    }
  }

  /** ขั้นสอง: ยืนยันว่าเป็นตัวเอง แล้วส่ง OTP */
  const confirmIdentity = async () => {
    if (!preview || isConfirming) return
    setIsConfirming(true)
    setErrorMsg(null)
    try {
      const accessToken = getLiffAccessToken()
      if (!accessToken) throw new Error('ไม่พบ LINE access token กรุณาเปิดในแอป LINE')

      await api.post(
        '/auth/otp/request',
        buildOtpRequestPayload(accessToken, preview.previewToken),
      )

      sessionStorage.setItem('liff_access_token', accessToken)
      router.push(next ? `/auth/otp?next=${encodeURIComponent(next)}` : '/auth/otp')
    } catch (err) {
      // ล้าง preview ทิ้งทุกกรณี ไม่ให้เหลือชื่อค้างบนจอหลังเกิด error
      setPreview(null)
      if (isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined
        if (err.response?.status === 409) {
          goToAlreadyLinked(getLiffAccessToken() ?? '')
          return
        }
        setErrorMsg(data?.message ?? 'กรุณาตรวจสอบรหัสพนักงานใหม่อีกครั้ง')
      } else if (err instanceof Error) {
        setErrorMsg(err.message)
      }
    } finally {
      setIsConfirming(false)
    }
  }

  const rejectIdentity = () => {
    setPreview(null)
    setErrorMsg(null)
    reset({ employeeCode: '' })
  }

  return (
    <div className="flex flex-col px-6 py-8">
      <div className="my-8 flex flex-col items-center text-center">
        <h2 className="text-xl font-bold text-foreground">ผูกบัญชี LINE</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {preview
            ? 'ตรวจสอบว่าเป็นข้อมูลของคุณก่อนรับรหัส OTP'
            : 'กรอกรหัสพนักงานเพื่อผูกบัญชีกับระบบ TBG Assistant'}
        </p>
      </div>

      {preview ? (
        // ── ขั้นยืนยันตัวตน ────────────────────────────────────
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card px-5 py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">ชื่อ-นามสกุลของพนักงาน</p>
            <p className="mt-1 text-lg font-bold text-foreground">{preview.fullName}</p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={confirmIdentity}
            disabled={isConfirming}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังส่ง OTP...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                ใช่ นี่คือฉัน
              </>
            )}
          </button>

          <button
            type="button"
            onClick={rejectIdentity}
            disabled={isConfirming}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            ไม่ใช่ กลับไปแก้ไข
          </button>

          <p className="text-center text-xs text-muted-foreground">
            ระบบจะส่ง OTP ทาง LINE หลังจากคุณกดยืนยันว่าเป็นข้อมูลของคุณ
          </p>
        </div>
      ) : (
        // ── ขั้นกรอกรหัสพนักงาน ────────────────────────────────
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="employeeCode" className="text-sm font-medium text-foreground">
              รหัสพนักงาน
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {/* type="text" เท่านั้น — type="number" หรือการแปลงเป็นตัวเลขจะกิน 0 นำหน้าทิ้ง */}
              <input
                id="employeeCode"
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder="เช่น 00123"
                className={`w-full rounded-xl border bg-whited py-3 pl-10 pr-4 text-sm tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.employeeCode ? 'border-destructive' : 'border-border focus:border-primary'
                }`}
                {...register('employeeCode')}
              />
            </div>
            {errors.employeeCode ? (
              <p className="text-xs text-destructive">{errors.employeeCode.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                กรอกรหัสพนักงานตามบัตร เช่น 00123 หรือ 123 ก็ได้
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังตรวจสอบ...
              </>
            ) : (
              'ตรวจสอบ'
            )}
          </button>
        </form>
      )}

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
