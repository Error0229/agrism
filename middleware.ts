import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET ?? 'dev-only-insecure-secret-change-me' })

  if (!token && req.nextUrl.pathname !== '/auth/login') {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/calendar/:path*',
    '/crops/:path*',
    '/fields/:path*',
    '/records/:path*',
    '/weather/:path*',
    '/ai/:path*',
    '/settings/:path*',
    '/api/planner/:path*',
  ],
}
