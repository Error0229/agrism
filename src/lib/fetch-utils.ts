/**
 * fetchWithRetry — fetch with exponential backoff and AbortController timeout.
 *
 * Retries up to `retries` times (default 3) with exponential backoff
 * starting at `baseDelayMs` (default 1000). Each request is aborted
 * after `timeoutMs` (default 10000).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit & {
    retries?: number
    baseDelayMs?: number
    timeoutMs?: number
  },
): Promise<Response> {
  const { retries = 3, baseDelayMs = 1000, timeoutMs = 10_000, ...fetchInit } = init ?? {}

  let lastError: unknown

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(input, { ...fetchInit, signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) return res
      // Non-ok but not a network error — still throw to trigger retry
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
    } catch (err) {
      clearTimeout(timer)
      lastError = err
    }

    // Wait before next retry (exponential backoff: 1s, 2s, 4s …)
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt))
    }
  }

  throw lastError
}
