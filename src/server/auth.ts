import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/server/db'
import { appUsers } from '@/server/db/schema'
import { getDefaultFarmIdForUser } from './auth-queries'

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Argon2 hashes start with $argon2 — dynamic import to avoid Edge runtime issues
  if (hash.startsWith('$argon2')) {
    const { verify } = await import('@node-rs/argon2')
    return verify(hash, password)
  }
  // Fall back to bcrypt for existing hashes
  return bcrypt.compare(password, hash)
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is required in production')
  }
  return secret ?? 'dev-only-insecure-secret-change-me'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase()
        const password = (credentials?.password as string) ?? ''
        if (!email || !password) return null

        const [user] = await db
          .select()
          .from(appUsers)
          .where(eq(appUsers.email, email))
          .limit(1)

        if (!user) return null

        const ok = await verifyPassword(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id
      // Fetch farmId on initial sign-in or when session is updated
      if ((user?.id || trigger === 'update') && token.sub) {
        const farmId = await getDefaultFarmIdForUser(token.sub)
        token.farmId = farmId
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      if (session.user && token.farmId) {
        session.user.farmId = token.farmId as string
      }
      return session
    },
  },
  secret: getSecret(),
})
