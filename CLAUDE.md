# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

花蓮蔬果種植指南 (Hualien Vegetable & Fruit Growing Guide) — a farming management web app for Hualien, Taiwan. All UI text is in Traditional Chinese (zh-TW). The app covers crop databases, visual field planning, planting calendars, farm record-keeping, and AI-powered farming advice localized to Hualien's subtropical climate.

## Commands

- `bun run dev` — start dev server (Turbopack)
- `bun run build` — production build
- `bun run lint` — ESLint

No test framework is configured.

## Architecture

**Framework**: Next.js 16 with App Router, React 19, TypeScript 5 (strict mode).

**Path alias**: `@/*` → `./src/*`

### Routing (`src/app/`)

| Route              | Purpose                                     |
| ------------------ | ------------------------------------------- |
| `/`                | Dashboard (stats, today's tasks)            |
| `/calendar`        | Planting calendar with task timeline        |
| `/crops`           | Crop database browser                       |
| `/crops/[cropId]`  | Individual crop detail (dynamic route)      |
| `/field-planner`   | Interactive Konva canvas for field layout   |
| `/farm-management` | Harvest logs, finances, soil notes, weather |
| `/ai-assistant`    | AI chat interface                           |

**API routes** (`src/app/api/`): `chat/` (streaming AI via OpenRouter GPT-4o), `crop-info/` (AI crop info generation), `weather/` (weather data).

### State Management

React Context + localStorage persistence via a custom `useLocalStorage` hook (`src/hooks/`). No external state library.

Provider tree in `src/lib/store/app-provider.tsx`:

- `CustomCropsProvider` — user-defined crop varieties
- `FieldsProvider` — fields, planted crops, positions
- `TasksProvider` — planting tasks with recurring schedule support
- `FarmManagementProvider` — harvest logs, finance records, soil notes, weather logs

Each provider exposes a custom hook (e.g. `useFields`, `useTasks`).

### Data Layer

- **No database** — all data is persisted in browser localStorage as JSON
- **Static crop data**: 15 predefined Hualien-region crops in `src/lib/data/crops-database.ts`
- **Companion planting data**: `src/lib/data/crop-companions.ts`
- **Crop lookup utilities**: `src/lib/data/crop-lookup.ts`

### Types

All core types and enums are in `src/lib/types/index.ts`: `Crop`, `CustomCrop`, `PlantedCrop`, `Field`, `Task`, `HarvestLog`, `FinanceRecord`, `SoilNote`, `WeatherLog`, and enums like `CropCategory`, `TaskType`, `WaterLevel`, `SunlightLevel`.

### UI & Styling

- **Tailwind CSS v4** (uses `@import "tailwindcss"` syntax, oklch color variables)
- **shadcn/ui** (New York style) — components in `src/components/ui/`
- **Canvas**: react-konva for the field planner visualization
- **Forms**: react-hook-form + zod validation
- **Charts**: recharts
- **Icons**: lucide-react

### AI Integration

Uses `@openrouter/ai-sdk-provider` with the Vercel AI SDK. System prompt in `src/lib/ai/system-prompt.ts` is specialized for Hualien farming conditions (typhoon season, subtropical climate, organic practices). Requires `OPENROUTER_API_KEY` env var.

### Key Patterns

- Pages are server components by default; interactive components use `"use client"` directive
- Utility helpers in `src/lib/utils/` handle task generation (`calendar-helpers.ts`), date formatting (`date-helpers.ts`), pest control (`pest-helpers.ts`), and planting suggestions (`planting-suggestions.ts`)
- `cn()` utility (`src/lib/utils.ts`) combines clsx + tailwind-merge for conditional class names
