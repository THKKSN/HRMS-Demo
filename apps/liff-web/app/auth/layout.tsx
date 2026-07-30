import type { ReactNode } from 'react'
import Image from 'next/image'
import logo from '@/public/hrms-logo.png'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Brand header ──────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-linear-to-b from-sky-500 to-sky-600 px-6 pb-16 pt-12 text-center text-white">
        {/* Decorative blobs */}
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-indigo-500/30 blur-2xl" />

        {/* Logo */}
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-white/20 shadow-xl backdrop-blur-sm overflow-hidden">
          <Image
            src={logo}
            alt="HRMS"
            width={48}
            height={48}
            className="object-contain rounded-full"
            priority
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">HRMS</h1>
        <p className="mt-1 text-sm text-sky-100">ระบบบริหารทรัพยากรบุคคล</p>
      </div>

      {/* ── Content card ──────────────────────────────────────── */}
      <div className="-mt-6 flex flex-1 flex-col rounded-t-3xl bg-background shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </div>
  )
}
