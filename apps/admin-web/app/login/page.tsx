'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'
import type { AuthResultDto } from '@hrms/shared-types'

const schema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      const res = await api.post<AuthResultDto>('/auth/login', values)
      const { accessToken, refreshToken, employee } = res.data
      setAuth(accessToken, refreshToken, employee)
      router.replace('/dashboard')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setError('password', { message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
      } else {
        setError('root', { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' })
      }
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel (desktop only) ────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-linear-to-br from-sky-600 via-sky-500 to-indigo-700 relative overflow-hidden flex-col items-center justify-center px-14 py-16">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-56 w-56 rounded-full bg-sky-300/20 blur-2xl" />

        {/* Grid dot pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 text-white max-w-xs w-full">
          {/* Logo */}
          <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 border border-white/30 shadow-xl backdrop-blur-sm overflow-hidden">
            <img src="/tbg-assistant.jpg" alt="TBG Assistant" className="h-12 w-12 object-cover rounded-full" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            TBG Assistant
          </h1>
          <p className="mt-3 text-lg text-sky-100 font-medium">
            ระบบบริหารจัดการข้อมูลภายใน
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: 'จัดการข้อมูลพนักงานและแผนก' },
              { label: 'อนุมัติคำขอลาและติดตามการทำงาน' },
              { label: 'รายงานสถิติและการวิเคราะห์ HR' },
            ].map(({ label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>
                <p className="text-sm text-sky-100">{label}</p>
              </div>
            ))}
          </div>

          {/* Dots indicator */}
          <div className="mt-14 flex gap-2">
            <div className="h-2 w-6 rounded-full bg-white/70" />
            <div className="h-2 w-2 rounded-full bg-white/40" />
            <div className="h-2 w-2 rounded-full bg-white/40" />
            <div className="h-2 w-2 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">

        {/* Mobile brand header */}
        <div className="mb-8 text-center lg:hidden">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted overflow-hidden">
            <img src="/tbg-assistant.jpg" alt="TBG Assistant" className="h-10 w-10 object-cover rounded-lg" />
          </div>
          <h1 className="text-xl font-bold text-foreground">TBG Assistant</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">ระบบบริหารจัดการข้อมูลภายใน</p>
        </div>

        {/* Desktop heading */}
        <div className="mb-8 hidden w-full max-w-sm lg:block">
          <h2 className="text-2xl font-bold text-foreground">ยินดีต้อนรับกลับ</h2>
          <p className="mt-1 text-sm text-muted-foreground">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              อีเมล
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder="admin@example.com"
                autoComplete="email"
                className={`w-full rounded-xl border bg-muted py-3 pl-10 pr-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.email ? 'border-destructive' : 'border-border focus:border-primary'
                }`}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full rounded-xl border bg-muted py-3 pl-10 pr-12 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.password ? 'border-destructive' : 'border-border focus:border-primary'
                }`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Root error */}
          {errors.root && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
              {errors.root.message}
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
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Powered by <span className='text-primary'>Thipparath Business Group Co.,Ltd.</span>
        </p>
      </div>
    </div>
  )
}
