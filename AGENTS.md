# AGENTS.md

## Project Overview

花蓮蔬果種植指南 (Hualien Vegetable & Fruit Growing Guide) is a farming management web app for Hualien, Taiwan. All UI text is in Traditional Chinese (zh-TW). The app includes crop database browsing, visual field planning, planting calendars, farm records, and AI-powered farming guidance localized for Hualien's subtropical climate.

## Commands

- `bun run dev` - Start dev server
- `bun run build` - Production build
- `bun run lint` - ESLint

No test framework is currently configured.

## Technical Context

- Framework: Next.js 16 (App Router), React 19, TypeScript 5 (strict mode)
- Styling/UI: Tailwind CSS v4 + shadcn/ui
- Canvas: react-konva (field planner)
- Forms and validation: react-hook-form + zod
- Charts: recharts
- Icons: lucide-react
- Path alias: `@/*` -> `./src/*`

### Routes

- `/` Dashboard
- `/calendar` Planting calendar and timeline
- `/crops` Crop database
- `/crops/[cropId]` Crop detail
- `/field-planner` Visual field planner
- `/farm-management` Harvest, finance, soil, weather records
- `/ai-assistant` AI chat assistant

### API Routes

- `/api/chat` Streaming AI chat (OpenRouter via Vercel AI SDK)
- `/api/crop-info` AI-generated crop info
- `/api/weather` Weather data endpoint

### State and Data

- State management: React Context providers with localStorage persistence
- Providers: custom crops, fields, tasks, farm management
- Data storage: no database; browser localStorage JSON
- Crop data sources: static crop database + companion planting data

### Notes

- OpenRouter requires `OPENROUTER_API_KEY` in environment variables.
- Pages are server components by default; interactive components use `"use client"`.

## GitHub Workflow

This repository uses a lightweight GitHub workflow based on milestones and labels.

## GitHub Workflow

- Use milestones as delivery phases:
  - `M1 - Crop Intelligence Foundation`
  - `M2 - Planning Intelligence`
  - `M3 - External Data & Reliability`
- Use labels for triage and execution:
  - Type: `type:feature`, `type:infra`, `type:data`, `type:docs`
  - Priority: `prio:p0`, `prio:p1`, `prio:p2`
  - Track: `track:crop-model`, `track:planning`, `track:integration`
  - Status: `status:ready`, `status:blocked`, `status:needs-review`
- Issue quality bar:
  - Clear problem statement
  - Acceptance criteria
  - Dependencies
  - Out-of-scope notes
- Prioritization rule:
  - Work highest-priority `status:ready` issues in current milestone first.
  - Move to the next milestone only after required items in the current milestone are complete.

## Brainstorming to Execution

- Start with breadth-first idea collection.
- Narrow to concrete issues after scope is approved.
- Keep implementation details in issue bodies, not only in chat history.
