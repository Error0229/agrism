# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

花蓮蔬果種植指南 (Hualien Vegetable & Fruit Growing Guide) — a farming management web app for Hualien, Taiwan. All UI text is in Traditional Chinese (zh-TW). The app covers crop databases, visual field planning, planting calendars, farm record-keeping, and AI-powered farming advice localized to Hualien's subtropical climate.

## Commands

- `bun run dev` — start dev server (Turbopack)
- `bun run build` — production build
- `bun run lint` — ESLint
- `bun run test:e2e` — Playwright E2E tests (uses port 3099 locally)

## Architecture

**Framework**: Next.js 16 with App Router, React 19, TypeScript 5 (strict mode).

**Path alias**: `@/*` → `./src/*`

### Routing (`src/app/`)

Authenticated routes use the `(app)` route group with middleware redirect to `/auth/login`.

| Route               | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `/`                 | Dashboard (stats, today's tasks, weather) |
| `/calendar`         | Planting calendar with task management    |
| `/crops`            | Crop database browser                     |
| `/crops/[cropId]`   | Individual crop detail (dynamic route)    |
| `/fields`           | Field list with create dialog             |
| `/fields/[fieldId]` | Interactive canvas field editor           |
| `/records/harvest`  | Harvest log management                    |
| `/records/finance`  | Financial records (income/expense)        |
| `/records/soil`     | Soil profiles, amendments, notes          |
| `/weather`          | Weather data and manual observation log   |
| `/ai`               | AI chat interface                         |
| `/settings`         | Account info, data export/import          |

**API routes** (`src/app/api/`): `chat/` (streaming AI via OpenRouter), `weather/` (Hualien weather data).

### Data Layer

- **Database**: Neon PostgreSQL via Drizzle ORM (`src/server/db/`)
- **Auth**: Auth.js v5 (next-auth) with credentials provider, JWT strategy
- **Server Actions**: `src/server/actions/` — all data mutations use `'use server'` actions with Zod validation

Schema tables (`src/server/db/schema/`):
- **auth**: `appUsers`, `farms`, `farmMembers`
- **crops**: `crops`, `cropTemplates`, `cropTemplateItems`
- **fields**: `fields`, `fieldContexts`, `plantedCrops`, `cropPlacements`, `facilities`, `utilityNodes`, `utilityEdges`
- **tasks**: `tasks`
- **records**: `harvestLogs`, `financeRecords`, `soilProfiles`, `soilAmendments`, `soilNotes`, `weatherLogs`

### State Management

- **Server state**: TanStack Query v5 hooks in `src/hooks/` for all data fetching/mutations
- **UI state**: Zustand store (`src/lib/store/field-editor-store.ts`) for the field editor (active tool, zoom, pan, grid, selection, undo/redo)
- **Auth context**: `useFarmId()` hook extracts farmId from the NextAuth session JWT

Key hooks: `useFarmId`, `useFields`, `useCrops`, `useTasks`, `useHarvestLogs`, `useFinanceRecords`, `useSoilProfile`, `useWeatherLogs`

### Types

- `src/lib/types/domain.ts` — core domain types (Crop, Field, Task, etc.)
- `src/lib/types/enums.ts` — all enums (CropCategory, TaskType, PlotType, etc.)
- `src/lib/types/labels.ts` — zh-TW label mappings for enums

### UI & Styling

- **Tailwind CSS v4** (uses `@import "tailwindcss"` syntax, oklch color variables)
- **shadcn/ui** (New York style) — components in `src/components/ui/`
- **Canvas**: react-konva for the field editor visualization
- **Forms**: react-hook-form + zod validation
- **Charts**: recharts
- **Icons**: lucide-react

### AI Integration

Uses `@openrouter/ai-sdk-provider` with the Vercel AI SDK. System prompt in `src/lib/ai/system-prompt.ts` is specialized for Hualien farming conditions (typhoon season, subtropical climate, organic practices). Requires `OPENROUTER_API_KEY` env var.

### Key Patterns

- Pages are server components by default; interactive components use `"use client"` directive
- Field editor uses command pattern for undo/redo (`src/lib/store/editor-commands.ts`)
- `cn()` utility (`src/lib/utils.ts`) combines clsx + tailwind-merge for conditional class names
- Middleware (`middleware.ts`) redirects unauthenticated users to `/auth/login`

### Environment Variables

Required:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` — Auth.js secret (falls back to dev secret locally)
- `OPENROUTER_API_KEY` — OpenRouter API key for AI features
