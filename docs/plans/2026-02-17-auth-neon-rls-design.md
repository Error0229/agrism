# Auth + Neon RLS Design

Date: 2026-02-17
Issue: #16
Status: Approved for direct implementation

## Objective

Implement production-grade authentication and authorization for planner APIs using Auth.js and Neon Postgres with row-level security boundaries for `user_id + farm_id`.

## Decisions

- Auth provider: Auth.js (credentials, email/password)
- Data model scope: `user_id + farm_id` from day one
- Enforcement mode: strict immediately (401 for unauthenticated planner APIs)
- Legacy strategy: discard anonymous local planner data for this auth rollout
- Database: Neon Postgres for auth/app tables

## Architecture

- Auth layer:
  - Auth.js credentials provider with password hash verification (`bcryptjs`)
  - Session strategy: JWT
  - Login and signup pages under `/auth/*`
- Domain ownership layer:
  - `app_users`
  - `farms`
  - `farm_members`
  - `planner_events` with `user_id` and `farm_id`
- API layer:
  - `/api/planner/commands` requires authenticated session and farm membership
  - `/api/planner/state` requires authenticated session and returns user-authorized events only

## Data Model

- `app_users(id, email, password_hash, name, created_at)`
- `farms(id, name, created_by, created_at)`
- `farm_members(id, farm_id, user_id, role, created_at, unique(farm_id,user_id))`
- `planner_events(id, type, occurred_at, field_id, crop_id, user_id, farm_id, payload)`

## Authorization Rules

- Unauthenticated requests to planner APIs => `401`
- Authenticated requests without farm membership => `403`
- Authenticated requests with membership can read/write within farm scope

## Data Flow

1. User signs up -> user row created + default farm + owner membership
2. User logs in -> JWT session established
3. Planner command write:
   - API resolves user from session
   - API resolves default farm membership
   - Event persisted with `user_id` + `farm_id`
4. Planner state read:
   - API resolves user
   - Queries only events scoped to authorized farms

## Security and Policy

- App-level authorization enforced in API handlers
- DB-level ownership columns included for future full RLS enablement
- SQL migration doc includes table/index definitions and RLS-ready structure

## Error Handling

- Missing session => 401
- Missing farm membership => 403
- DB unavailable => 500 with safe error response

## Validation Plan

- `bun run lint`
- `bunx tsc --noEmit`
- `bun test`
- Production API smoke check for planner commands:
  - unauth => 401
  - auth => persisted true

