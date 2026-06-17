import { type NextRequest, NextResponse } from 'next/server'

// Next.js middleware รัน Edge Runtime — อ่าน Zustand localStorage ไม่ได้โดยตรง
// ใช้ cookie "hrms-auth-token" แทน (set จาก client หลัง setAuth)
export function proxy(request: NextRequest) {
  const token = request.cookies.get('hrms-access-token')?.value
  const { pathname } = request.nextUrl

  const isAuthPath = pathname.startsWith('/auth')

  if (!token && !isAuthPath) {
    return NextResponse.redirect(new URL('/auth/link', request.url))
  }

  if (token && isAuthPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
