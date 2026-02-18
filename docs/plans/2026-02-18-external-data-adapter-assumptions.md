# External Data Adapter Assumptions

Date: 2026-02-18
Issue: #24
Status: Implementation notes

## Security Assumptions

- External adapters should avoid embedding long-lived credentials in browser-visible code.
- Provider keys/tokens (when real providers are introduced) must be stored server-side only.
- Adapter responses should be normalized before UI usage; no direct UI dependency on provider-specific payload fields.
- Errors from providers should be sanitized before returning to clients.

## Rate-Limit Assumptions

- UI reads should go through a single integration overview endpoint to reduce fan-out.
- Adapters are expected to be polled at bounded intervals; avoid per-render fetch loops.
- Provider failures should degrade gracefully to cached/mock/null payloads without blocking local planning features.
- Future production providers should support per-source timeout and retry budgets to avoid cascading latency.

## Current Scope

- Implemented mock adapters for climate, market price, and sensor snapshots.
- Added normalized `freshness` + `confidence` metadata envelope at adapter boundary.
- Added orchestration service and API endpoint `/api/integration/overview`.
