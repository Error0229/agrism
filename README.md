# 花蓮蔬果種植指南 (Agrism)

花蓮在地化的農務管理 Web App（Next.js + React + TypeScript），提供作物資料、田地規劃、排程管理、天氣與 AI 農務建議。

## Core Features

- 作物資料庫（含自訂作物與模板）
- 田地規劃（2D 視覺化配置）
- 種植任務排程與每週優先級建議
- 播種時機與延後模擬
- 輪作與相伴種植風險提醒
- 花蓮天氣整合（預報、警示、信心度）
- AI 助手（在地化花蓮農務建議）

## Tech Stack

- Next.js 16 / React 19 / TypeScript 5
- Tailwind CSS v4 + shadcn/ui
- react-konva（田地畫布）
- Vercel AI SDK + OpenRouter（AI 功能）
- LocalStorage persistence（目前無資料庫）

## Local Development

```bash
bun install
bun run dev
```

Open: `http://localhost:3000`

## Environment Variables

Create `.env` with:

```bash
OPENROUTER_API_KEY=your_key_here
DATABASE_URL=your_neon_postgres_url
```

- If `OPENROUTER_API_KEY` is omitted, AI-related features fail.
- If `DATABASE_URL` is omitted, planner event sourcing still works locally, but Neon persistence APIs return non-persisted mode.

## Quality Commands

```bash
bun run lint
bunx tsc --noEmit
bun test
bun run build
```

## Project Workflow

- Repository workflow details: `AGENTS.md`
- Brainstorming/design record: `docs/plans/2026-02-17-farmer-feature-breadth-design.md`
- CI pipeline: `.github/workflows/ci.yml`

## Architecture Snapshot

- Routes: `src/app/`
  - `/`, `/calendar`, `/crops`, `/field-planner`, `/farm-management`, `/ai-assistant`
- API routes: `src/app/api/`
  - `chat`, `crop-info`, `weather`
- State and persistence: `src/lib/store/*` + `src/hooks/use-local-storage.ts`
- Domain logic:
  - Crop schema/migration: `src/lib/data/crop-schema.ts`
  - Task prioritization: `src/lib/utils/task-prioritizer.ts`
  - Rotation/companion checks: `src/lib/utils/rotation-companion-checker.ts`
  - Weather providers/alerts/confidence: `src/lib/weather/*`
