# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

花蓮蔬果種植指南 (Hualien Vegetable & Fruit Growing Guide) — a farming management web app for Hualien, Taiwan. All UI text is in Traditional Chinese (zh-TW). The app covers crop databases, visual field planning, planting calendars, farm record-keeping, and AI-powered farming advice localized to Hualien's subtropical climate.

## Commands

- `bun run dev` — start dev server (Turbopack)
- `bun run build` — production build
- `bun run lint` — ESLint
- `bun run test:e2e` — Playwright E2E tests (uses port 3099 locally)
- `bun run convex` — Convex dev server

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

- **Database**: Convex (real-time database) — schema in `convex/schema.ts`, backend functions in `convex/`
- **Auth**: Clerk (`@clerk/nextjs`) with Convex integration
- **Mutations**: Convex mutations in `convex/` — all data mutations use Convex validators

Convex tables (15 tables, defined in `convex/schema.ts`):
- **auth**: `users`, `farms`, `farmMembers`
- **crops**: `crops`, `cropTemplates`, `cropTemplateItems`
- **fields**: `fields` (with inlined `fieldContexts` and `cropPlacements`), `plantedCrops`, `facilities`, `utilityNodes`, `utilityEdges`
- **tasks**: `tasks`
- **records**: `harvestLogs`, `financeRecords`, `soilProfiles` (inlined), `soilAmendments`, `soilNotes`, `weatherLogs`

### State Management

- **Server state**: Convex `useQuery`/`useMutation` hooks in `src/hooks/` (real-time, automatic reactivity)
- **UI state**: Zustand store (`src/lib/store/field-editor-store.ts`) for the field editor (active tool, zoom, pan, grid, selection, undo/redo)
- **Auth context**: `useFarmId()` resolves farm via Convex query

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
- Middleware (`middleware.ts`) uses Clerk's `clerkMiddleware` to protect routes
- Convex mutations use validators for input validation

### Environment Variables

Required:
- `CONVEX_DEPLOYMENT` — Convex deployment identifier
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key
- `OPENROUTER_API_KEY` — OpenRouter API key for AI features
