'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { buildOtpRequestPayload } from '@/lib/auth-link'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthResultDto, ApiError } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

function OtpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const setAuth = useAuthStore((s) => s.setAuth)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [isResending, setIsResending] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const focusBox = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus()
  }

  const handleChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '')
    if (!clean) return
    const char = clean[clean.length - 1]
    const next = [...digits]
    next[index] = char
    setDigits(next)
    setErrorMsg(null)
    if (index < OTP_LENGTH - 1) focusBox(index + 1)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else {
        focusBox(index - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight') {
      focusBox(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!text) return
    const next = Array(OTP_LENGTH).fill('')
    text.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    focusBox(Math.min(text.length, OTP_LENGTH - 1))
  }

  const otpCode = digits.join('')

  const submit = useCallback(async () => {
    if (otpCode.length < OTP_LENGTH) return
    const lineAccessToken = sessionStorage.getItem('liff_access_token')
    if (!lineAccessToken) {
      router.replace('/auth/link')
      return
    }
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await api.post<AuthResultDto>('/auth/link', {
        accessToken: lineAccessToken,
        otp: otpCode,
      })
      sessionStorage.removeItem('liff_access_token')
      sessionStorage.removeItem('liff_preview_token')
      const { accessToken, refreshToken, employee } = res.data
      setAuth(accessToken, refreshToken, employee)
      router.replace(next)
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined
        setErrorMsg(data?.message ?? 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ')
      }
      setDigits(Array(OTP_LENGTH).fill(''))
      focusBox(0)
    } finally {
      setIsSubmitting(false)
    }
  }, [otpCode, router, setAuth, next])

  useEffect(() => {
    if (otpCode.length === OTP_LENGTH) {
      submit()
    }
  }, [otpCode, submit])

  const handleResend = async () => {
    if (cooldown > 0) return
    const lineAccessToken = sessionStorage.getItem('liff_access_token')
    const previewToken = sessionStorage.getItem('liff_preview_token')
    if (!lineAccessToken || !previewToken) {
      router.replace('/auth/link')
      return
    }
    setIsResending(true)
    try {
      await api.post('/auth/otp/request', buildOtpRequestPayload(lineAccessToken, previewToken))
      setCooldown(RESEND_COOLDOWN)
      setDigits(Array(OTP_LENGTH).fill(''))
      setErrorMsg(null)
      focusBox(0)
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined
        if (data?.error === 'INVALID_OR_EXPIRED_PREVIEW') {
          sessionStorage.removeItem('liff_access_token')
          sessionStorage.removeItem('liff_preview_token')
          router.replace('/auth/link')
          return
        }
        setErrorMsg(data?.message ?? 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่')
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-col px-6 py-8">
      {/* Page heading */}
      <div className="mb-8 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">ยืนยัน OTP</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            กรุณากรอกรหัส 6 หลักที่ระบบส่งเข้าแชท LINE ของคุณ
          </p>
        </div>
      </div>

      {/* วิธีหารหัส */}
      <div className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <p>
          ออกจากหน้านี้ไปเปิด<span className="font-semibold text-foreground">แชท LINE</span>เพื่อดูรหัสได้ตามปกติ
          ระบบจะไม่ปิดแอปนี้ — เมื่อเห็นรหัสแล้วให้แตะปุ่ม
          <span className="font-semibold text-foreground">&quot;กลับไปกรอกรหัส&quot;</span>ในข้อความ
          หรือสลับกลับมาที่หน้านี้ได้เลย
        </p>
      </div>

      {/* OTP boxes */}
      <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isSubmitting}
            className={`h-14 w-11 rounded-xl border-2 bg-whited text-center text-xl font-bold tracking-widest transition-colors focus:outline-none ${
              errorMsg
                ? 'border-destructive text-destructive'
                : digit
                ? 'border-primary text-primary'
                : 'border-border focus:border-primary'
            }`}
          />
        ))}
      </div>

      {/* Loading */}
      {isSubmitting && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังตรวจสอบ...
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Progress bar showing filled boxes */}
      <div className="mt-6 flex gap-1.5">
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < digits.filter(Boolean).length ? 'bg-primary' : 'bg-whited'
            }`}
          />
        ))}
      </div>

      {/* Resend + back */}
      <div className="mt-8 space-y-3 text-center">
        <div className="text-sm text-muted-foreground">
          {cooldown > 0 ? (
            <span>
              ส่งรหัสใหม่ได้ใน{' '}
              <span className="font-semibold tabular-nums text-foreground">{cooldown}</span>{' '}
              วินาที
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="font-semibold text-primary disabled:opacity-60"
            >
              {isResending ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังส่ง...
                </span>
              ) : (
                'ส่งรหัส OTP ใหม่'
              )}
            </button>
          )}
        </div>

        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          ย้อนกลับ
        </button>
      </div>
    </div>
  )
}

export default function OtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <OtpContent />
    </Suspense>
  )
}
