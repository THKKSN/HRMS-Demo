'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthResultDto, ApiError } from '@hrms/shared-types'
import { isAxiosError } from 'axios'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

export default function OtpPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [isResending, setIsResending] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const focusBox = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus()
  }

  const handleChange = (index: number, value: string) => {
    // รับเฉพาะตัวเลข
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
      const { accessToken, refreshToken, employee } = res.data
      setAuth(accessToken, refreshToken, employee)
      router.replace('/')
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
  }, [otpCode, router, setAuth])

  // auto-submit เมื่อกรอกครบ
  useEffect(() => {
    if (otpCode.length === OTP_LENGTH) {
      submit()
    }
  }, [otpCode, submit])

  const handleResend = async () => {
    if (cooldown > 0) return
    const lineAccessToken = sessionStorage.getItem('liff_access_token')
    if (!lineAccessToken) {
      router.replace('/auth/link')
      return
    }

    setIsResending(true)
    try {
      await api.post('/auth/otp/resend', { accessToken: lineAccessToken })
      setCooldown(RESEND_COOLDOWN)
      setDigits(Array(OTP_LENGTH).fill(''))
      setErrorMsg(null)
      focusBox(0)
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined
        setErrorMsg(data?.message ?? 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่')
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">ยืนยัน OTP</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          กรุณากรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมลของคุณ
        </p>
      </div>

      {/* OTP boxes */}
      <div className="flex justify-center gap-3" onPaste={handlePaste}>
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
            className="h-14 w-12 rounded-xl border-2 border-border bg-background text-center text-xl font-bold focus:border-primary focus:outline-none"
            disabled={isSubmitting}
          />
        ))}
      </div>

      {/* loading / error */}
      {isSubmitting && (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* resend */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        {cooldown > 0 ? (
          <span>ส่งรหัสใหม่ได้ใน {cooldown} วินาที</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={isResending}
            className="font-medium text-primary disabled:opacity-60"
          >
            {isResending ? 'กำลังส่ง...' : 'ส่งรหัส OTP ใหม่'}
          </button>
        )}
      </div>

      {/* back */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ย้อนกลับ
        </button>
      </div>
    </div>
  )
}
