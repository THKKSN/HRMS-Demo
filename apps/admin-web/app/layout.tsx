import type { Metadata } from 'next'
import { Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-sans-thai',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'HRMS Admin',
  description: 'ระบบบริหารทรัพยากรบุคคล — สำหรับ HR และผู้บริหาร',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full bg-background text-foreground font-(family-name:--font-noto-sans-thai)">
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors closeButton duration={3000} />
        </QueryProvider>
      </body>
    </html>
  )
}
