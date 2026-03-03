'use client'

import { useSession } from 'next-auth/react'

/**
 * Returns the current user's default farmId from the session JWT.
 * Returns undefined while the session is loading or when user has no farm.
 */
export function useFarmId(): string | undefined {
  const { data: session } = useSession()
  return session?.user?.farmId ?? undefined
}

/**
 * Returns farmId together with the session status so consumers can
 * distinguish between "loading", "no farm", and "has farm".
 */
export function useFarmIdWithStatus() {
  const { data: session, status } = useSession()
  const farmId = session?.user?.farmId ?? undefined
  return { farmId, sessionStatus: status } as const
}
