import { auth } from '@/server/auth'

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== '/auth/login') {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin)
    return Response.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    // Legacy routes (kept during migration)
    '/',
    '/calendar/:path*',
    '/crops/:path*',
    '/farm-management/:path*',
    '/field-planner/:path*',
    '/ai-assistant/:path*',
    // New v2 routes
    '/fields/:path*',
    '/records/:path*',
    '/weather/:path*',
    '/ai/:path*',
    '/settings/:path*',
    // Protected API routes
    '/api/planner/:path*',
  ],
}
