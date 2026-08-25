import { type NextRequest, NextResponse } from 'next/server'

// Next.js middleware รัน Edge Runtime — อ่าน Zustand localStorage ไม่ได้โดยตรง
// ใช้ cookie "hrms-auth-token" แทน (set จาก client หลัง setAuth)
export function proxy(request: NextRequest) {
  const token = request.cookies.get('hrms-access-token')?.value
  const { pathname } = request.nextUrl

  const isAuthPath = pathname.startsWith('/auth')
  const liffState = request.nextUrl.searchParams.get('liff.state')

  // เส้นทางบุคคลภายนอกใช้ external auth คนละชุด (จัดการใน layout ฝั่ง client) — ไม่ผ่าน employee token guard
  if (pathname.startsWith('/external')) {
    return NextResponse.next()
  }
  if (liffState && liffState.startsWith('/external')) {
    return NextResponse.redirect(new URL(liffState, request.url))
  }

  if (liffState && liffState !== '/' && !liffState.startsWith('/auth')) {
    if (token) {
      return NextResponse.redirect(new URL(liffState, request.url))
    }

    const authUrl = new URL('/auth/link', request.url)
    authUrl.searchParams.set('next', liffState)
    return NextResponse.redirect(authUrl)
  }

  if (!token && !isAuthPath) {
    const authUrl = new URL('/auth/link', request.url)
    const next = liffState ?? `${pathname}${request.nextUrl.search}`

    if (next && next !== '/' && !next.startsWith('/auth')) {
      authUrl.searchParams.set('next', next)
    }

    return NextResponse.redirect(authUrl)
  }

  if (token && isAuthPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
