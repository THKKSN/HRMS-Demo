'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Hash, Loader2, User, X } from 'lucide-react'
import { useLiffContext } from '@/components/providers/liff-provider'
import { buildLiffUrl, getLiffAccessToken, liff } from '@/lib/liff'
import { buildLinkPreviewPayload, buildOtpRequestPayload } from '@/lib/auth-link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiError, AuthResultDto } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

/** ผลจาก /auth/otp/request — ปกติได้แค่ hint แต่ถ้า LINE push เต็ม backend จะแนบ session มาให้ล็อกอินตรง */
type OtpRequestResult = { hint: string; session?: AuthResultDto }

const LINE_LOGIN_QUERY_KEYS = [
  'code',
  'state',
  'liff.state',
  'liff.referrer',
  'friendship_status_changed',
  'error',
  'error_description',
]

type LinkTranslator = ReturnType<typeof useTranslations<'liff.auth.link'>>

// ข้อความ validation มาจากไฟล์ภาษา จึงสร้าง schema ในคอมโพเนนต์ (แผน i18n งาน 1.14)
function buildSchema(t: LinkTranslator) {
  return z.object({
    employeeCode: z
      .string()
      .trim()
      .min(1, t('validation.employeeCodeRequired'))
      .max(50, t('validation.employeeCodeMax')),
  })
}
type FormValues = z.infer<ReturnType<typeof buildSchema>>

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
  const t = useTranslations('liff.auth.link')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''
  const { isReady, isLoggedIn, error } = useLiffContext()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const schema = useMemo(() => buildSchema(t), [t])
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
        <p className="text-sm text-muted-foreground">{tCommon('state.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">{t('liffErrorTitle')}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <p className="max-w-sm rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {t('liffErrorHint')}
        </p>
      </div>
    )
  }

  // ── ยังไม่ได้ login LINE ─────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">{t('loginTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>
        <button
          onClick={openLineLogin}
          className="flex w-full max-w-xs items-center justify-center gap-2.5 rounded-2xl bg-[#06C755] py-3.5 text-sm font-bold text-white shadow-sm shadow-green-500/30 transition-opacity hover:opacity-90"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.02 2 11c0 3.28 1.85 6.16 4.65 7.88l-.65 2.62L8.96 20C9.93 20.32 10.95 20.5 12 20.5c5.52 0 10-4.02 10-9S17.52 2 12 2z"/>
          </svg>
          {t('loginButton')}
        </button>
        <Link
          href="/external"
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          {t('externalLink')}
        </Link>
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
      if (!accessToken) throw new Error(t('errors.noAccessToken'))

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
        setErrorMsg(data?.message ?? t('errors.checkCode'))
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
      if (!accessToken) throw new Error(t('errors.noAccessToken'))

      const res = await api.post<OtpRequestResult>(
        '/auth/otp/request',
        buildOtpRequestPayload(accessToken, preview.previewToken),
      )

      // LINE push เต็ม — backend ผูกบัญชีให้แล้วส่ง session กลับมา เข้าระบบตรง ข้ามหน้า OTP
      if (res.data.session) {
        const { accessToken: at, refreshToken, employee } = res.data.session
        setAuth(at, refreshToken, employee)
        sessionStorage.removeItem('liff_access_token')
        sessionStorage.removeItem('liff_preview_token')
        router.replace(next || '/')
        return
      }

      sessionStorage.setItem('liff_access_token', accessToken)
      sessionStorage.setItem('liff_preview_token', preview.previewToken)
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
        setErrorMsg(data?.message ?? t('errors.checkCode'))
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
        <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {preview ? t('subtitlePreview') : t('subtitleForm')}
        </p>
      </div>

      {preview ? (
        // ── ขั้นยืนยันตัวตน ────────────────────────────────────
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card px-5 py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t('employeeNameLabel')}</p>
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
                {t('sendingOtp')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {t('confirmIdentity')}
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
            {t('rejectIdentity')}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {t('otpNotice')}
          </p>
        </div>
      ) : (
        // ── ขั้นกรอกรหัสพนักงาน ────────────────────────────────
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="employeeCode" className="text-sm font-medium text-foreground">
              {t('employeeCode')}
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {/* type="text" เท่านั้น — type="number" หรือการแปลงเป็นตัวเลขจะกิน 0 นำหน้าทิ้ง */}
              <input
                id="employeeCode"
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder={t('employeeCodePlaceholder')}
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
                {t('employeeCodeHint')}
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
                {tCommon('state.checking')}
              </>
            ) : (
              t('check')
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('securityNote')}
      </p>

      {/* ทางเข้าสำหรับบุคคลภายนอก (ผู้ที่ไม่ใช่พนักงาน) — ใช้ external auth คนละชุด ไม่ต้องผูกรหัสพนักงาน */}
      <div className="mt-8 border-t border-border pt-6 text-center">
        <p className="text-xs text-muted-foreground">{t('notEmployee')}</p>
        <Link
          href="/external"
          className="mt-2 inline-block rounded-xl border border-primary px-6 py-2.5 text-sm font-semibold text-primary"
        >
          {t('externalLink')}
        </Link>
      </div>
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
