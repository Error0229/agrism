/**
 * fetchWithRetry — fetch with exponential backoff and AbortController timeout.
 *
 * Retries up to `retries` times (default 3) with exponential backoff
 * starting at `baseDelayMs` (default 1000). Each request is aborted
 * after `timeoutMs` (default 10000).
 *
 * Only retries on 5xx errors and network failures — 4xx errors throw immediately.
 * Caller-provided AbortSignal is combined with the internal timeout signal.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit & {
    retries?: number
    baseDelayMs?: number
    timeoutMs?: number
  },
): Promise<Response> {
  const { retries = 3, baseDelayMs = 1000, timeoutMs = 10_000, signal: callerSignal, ...fetchInit } = init ?? {}

  let lastError: Error = new Error("No retries attempted")

  for (let attempt = 0; attempt < retries; attempt++) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)

    // Combine caller's signal with the internal timeout signal
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal

    try {
      const res = await fetch(input, { ...fetchInit, signal })
      if (res.ok) return res
      // 4xx errors are deterministic — do not retry
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      // 5xx errors — throw to trigger retry
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // If the caller aborted, don't retry
      if (callerSignal?.aborted) {
        throw lastError
      }
    }

    // Wait before next retry (exponential backoff: 1s, 2s, 4s …)
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt))
    }
  }

  throw lastError
}
