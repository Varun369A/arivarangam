import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// The one protected route — the arena
const PROTECTED_ROUTES = ['/arena']

// Admin routes — require auth AND admin role
const ADMIN_ROUTES = ['/admin']

// Public routes — no auth required
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/admin-login',
  '/terms',
  '/privacy',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some(r => pathname.startsWith(r))
}

function isAdmin(pathname: string): boolean {
  return ADMIN_ROUTES.some(r => pathname.startsWith(r))
}

function isPublic(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true
  return PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('accessToken')?.value

  // Public routes
  if (isPublic(pathname)) {
    // Redirect logged-in users away from auth pages → to arena
    if (accessToken && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/arena', request.url))
    }
    const res = NextResponse.next()
    if (pathname === '/login' || pathname === '/signup') {
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      res.headers.set('Pragma', 'no-cache')
    }
    return res
  }

  // Admin routes
  if (isAdmin(pathname)) {
    if (!accessToken) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res
  }

  // Arena + any other protected route
  if (isProtected(pathname)) {
    if (!accessToken) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
