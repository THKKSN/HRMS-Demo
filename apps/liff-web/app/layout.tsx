import type { Metadata } from 'next'
import { Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import { LiffProvider } from '@/components/providers/liff-provider'
import { QueryProvider } from '@/components/providers/query-provider'

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-sans-thai',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'HRMS',
  description: 'ระบบบริหารทรัพยากรบุคคล',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground font-(family-name:--font-noto-sans-thai)">
        <LiffProvider>
          <QueryProvider>
            {/* mobile frame: จำกัดความกว้าง 430px กลางจอ */}
            <div className="mx-auto max-w-107.5 min-h-screen flex flex-col">
              {children}
            </div>
          </QueryProvider>
        </LiffProvider>
      </body>
    </html>
  )
}
