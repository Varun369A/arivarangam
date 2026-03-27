import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/task',
  '/repos',
  '/settings',
]

// Admin routes — require auth AND admin role
const ADMIN_ROUTES = ['/admin']

// Routes that are always public — no redirect needed
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
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
}

function isAdmin(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route))
}

function isPublic(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('accessToken')?.value

  // Always allow public routes first (before admin check — /admin-login starts with /admin)
  if (isPublic(pathname)) {
    if (accessToken && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Prevent browser from showing cached auth pages after logout (back button fix)
    const publicRes = NextResponse.next()
    if (pathname === '/login' || pathname === '/signup') {
      publicRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      publicRes.headers.set('Pragma', 'no-cache')
    }
    return publicRes
  }

  // Admin routes: require authentication
  if (isAdmin(pathname)) {
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const adminRes = NextResponse.next()
    adminRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    adminRes.headers.set('Pragma', 'no-cache')
    return adminRes
  }

  // Protected routes: require authentication
  if (isProtected(pathname)) {
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const protectedRes = NextResponse.next()
    protectedRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    protectedRes.headers.set('Pragma', 'no-cache')
    return protectedRes
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder files (images, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
