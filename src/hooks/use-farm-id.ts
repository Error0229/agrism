'use client'

import { useSession } from 'next-auth/react'

/**
 * Returns the current user's default farmId from the session JWT.
 * Returns undefined while the session is loading.
 */
export function useFarmId(): string | undefined {
  const { data: session } = useSession()
  return session?.user?.farmId ?? undefined
}
