import { NextResponse } from 'next/server'

// Auth protection is handled client-side via useAuthGuard + Zustand (_hasHydrated pattern)
// No server-side middleware needed for this admin SPA
export function proxy() {
  return NextResponse.next()
}
