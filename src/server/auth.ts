import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { verify } from '@node-rs/argon2'
import { db } from '@/server/db'
import { appUsers } from '@/server/db/schema'

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Argon2 hashes start with $argon2
  if (hash.startsWith('$argon2')) {
    return verify(hash, password)
  }
  // Fall back to bcrypt for existing hashes
  return bcrypt.compare(password, hash)
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
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'dev-only-insecure-secret-change-me',
})
