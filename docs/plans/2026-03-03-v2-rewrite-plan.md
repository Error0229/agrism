# Agrism v2 Full Rewrite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Agrism farming management app from localStorage-first to server-authoritative PostgreSQL, with proper separation of concerns, Drizzle ORM, TanStack Query, Zustand, and a redesigned field editor.

**Architecture:** Server-authoritative data model using Neon PostgreSQL via Drizzle ORM. TanStack Query for server state caching. Zustand for client-only UI state. Next.js App Router with Server Actions. Auth.js v5 for authentication. All UI remains Traditional Chinese (zh-TW).

**Tech Stack:** Next.js 16, React 19, TypeScript 5 strict, Drizzle ORM, TanStack Query v5, Zustand, Tailwind CSS v4, shadcn/ui, react-konva (benchmark-gated), react-hook-form + zod, recharts, Vercel AI SDK + OpenRouter, Auth.js v5

**Design docs reference:** `C:\Users\Tim\agrism\docs\design\` (main repo, untracked)
**Synthesis doc (authoritative):** `docs/design/00-critical-analysis/cross-agent-review-and-decision-synthesis.md`

---

## Phase 1: Foundation (Database + Auth + Project Setup)

### Task 1: Install new dependencies and clean up package.json

**Files:**
- Modify: `package.json`

Install: drizzle-orm, drizzle-kit, @tanstack/react-query, zustand, @auth/core, @auth/drizzle-adapter
Remove: uuid (use crypto.randomUUID()), bcryptjs (consider @node-rs/argon2)
Keep: everything else per v2-recommendations.md

### Task 2: Drizzle ORM schema — auth tables

**Files:**
- Create: `src/server/db/schema/auth.ts`
- Create: `src/server/db/index.ts`
- Create: `drizzle.config.ts`

Define: app_users, farms, farm_members tables matching existing PostgreSQL schema.
Use existing Neon DATABASE_URL. Introspect existing tables, then codify in Drizzle.

### Task 3: Drizzle ORM schema — all domain tables

**Files:**
- Create: `src/server/db/schema/crops.ts`
- Create: `src/server/db/schema/fields.ts`
- Create: `src/server/db/schema/tasks.ts`
- Create: `src/server/db/schema/records.ts`
- Create: `src/server/db/schema/index.ts`

Tables per v2-recommendations.md:
- crops, crop_templates, crop_template_items
- fields, field_contexts, planted_crops, crop_placements, facilities, utility_nodes, utility_edges
- tasks
- harvest_logs, finance_records, soil_profiles, soil_amendments, soil_notes, weather_logs

All use English enum values. All spatial data in meters. Proper FKs, constraints, indexes.

### Task 4: Generate and run initial migration

Push schema to Neon. Verify tables created. Keep existing auth tables intact.

### Task 5: Auth.js v5 upgrade

**Files:**
- Create: `src/server/auth.ts` (Auth.js v5 config)
- Modify: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/app/api/auth/signup/route.ts`
- Modify: `src/middleware.ts`
- Modify: `src/components/auth/session-provider.tsx`

Upgrade from NextAuth.js v4 to Auth.js v5. Use Drizzle adapter. Keep Credentials provider.
Maintain existing login/signup flow. Use Argon2 for new password hashing.

### Task 6: TanStack Query provider setup

**Files:**
- Create: `src/lib/query-client.ts`
- Create: `src/components/providers.tsx`
- Modify: `src/app/layout.tsx`

Set up QueryClientProvider. Remove old provider nesting (AppProvider → CustomCropsProvider → FieldsProvider → TasksProvider → FarmManagementProvider).

---

## Phase 2: Domain Types + Server Actions + Query Hooks

### Task 7: New TypeScript domain types

**Files:**
- Create: `src/lib/types/domain.ts`
- Create: `src/lib/types/enums.ts`
- Create: `src/lib/types/labels.ts`

English enum values with Chinese display label mappings.
Separate PlantedCrop / CropPlacement / Facility entities.
All spatial units in meters.

### Task 8: Seed data — default crops

**Files:**
- Create: `src/server/db/seed/crops.ts`

Migrate 21 default Hualien crops from static JSON to DB seed script.
Convert Chinese enum values to English in the data.

### Task 9: Server Actions — crops

**Files:**
- Create: `src/server/actions/crops.ts`

CRUD: getCrops, getCropById, createCustomCrop, updateCustomCrop, deleteCustomCrop
Template actions: getCropTemplates, createTemplate, applyTemplate, deleteTemplate

### Task 10: Server Actions — fields + planted crops

**Files:**
- Create: `src/server/actions/fields.ts`

CRUD: getFields, getFieldById, createField, updateField, deleteField
Planted crops: plantCrop, updatePlantedCrop, removePlantedCrop, harvestCrop
Placements: updateCropPlacement
Facilities: createFacility, updateFacility, deleteFacility
Utilities: createUtilityNode, createUtilityEdge, deleteUtilityNode, deleteUtilityEdge

### Task 11: Server Actions — tasks

**Files:**
- Create: `src/server/actions/tasks.ts`

CRUD: getTasks, createTask, updateTask, deleteTask, toggleTaskComplete
Auto-generation: generateTasksForPlantedCrop (seeding, fertilizing, watering, pruning, harvesting, typhoon prep)

### Task 12: Server Actions — farm records

**Files:**
- Create: `src/server/actions/harvest.ts`
- Create: `src/server/actions/finance.ts`
- Create: `src/server/actions/soil.ts`
- Create: `src/server/actions/weather-logs.ts`

All CRUD for harvest logs, finance records, soil (profiles + amendments + notes), weather logs.

### Task 13: TanStack Query hooks

**Files:**
- Create: `src/hooks/use-crops.ts`
- Create: `src/hooks/use-fields.ts`
- Create: `src/hooks/use-tasks.ts`
- Create: `src/hooks/use-harvest.ts`
- Create: `src/hooks/use-finance.ts`
- Create: `src/hooks/use-soil.ts`
- Create: `src/hooks/use-weather-logs.ts`

Each hook wraps server actions with useQuery/useMutation. Proper cache invalidation.

---

## Phase 3: Route Restructure + Core Pages

### Task 14: New route structure and navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/(app)/layout.tsx` (authenticated app shell)
- Create route stubs for new structure:
  - `/fields`, `/fields/[fieldId]`
  - `/records/harvest`, `/records/finance`, `/records/soil`
  - `/weather`
  - `/settings`
- Modify: `src/components/layout/app-sidebar.tsx`

Per v2-recommendations: one workflow per route. Split farm-management into records/*.

### Task 15: Dashboard — focused "What Now?"

**Files:**
- Create: `src/app/(app)/page.tsx`
- Create: `src/components/dashboard/todays-tasks.tsx`
- Create: `src/components/dashboard/weather-alert.tsx`
- Create: `src/components/dashboard/quick-stats.tsx`
- Create: `src/components/dashboard/next-harvests.tsx`

Only 4 focused sections. Remove integration status, workload forecast, planting suggestions, field overview.

### Task 16: Crop database pages

**Files:**
- Create: `src/app/(app)/crops/page.tsx`
- Create: `src/app/(app)/crops/[cropId]/page.tsx`
- Rebuild: crop-card, crop-search, crop-detail, custom-crop-dialog, crop-template-manager

All using TanStack Query hooks instead of context.

### Task 17: Calendar page

**Files:**
- Create: `src/app/(app)/calendar/page.tsx`
- Rebuild: planting-calendar, task-timeline, add-task-dialog

Using TanStack Query hooks. Keep react-day-picker.

### Task 18: Records pages (harvest, finance, soil)

**Files:**
- Create: `src/app/(app)/records/layout.tsx`
- Create: `src/app/(app)/records/harvest/page.tsx`
- Create: `src/app/(app)/records/finance/page.tsx`
- Create: `src/app/(app)/records/soil/page.tsx`

Each as its own focused page. Rebuild forms + tables using hooks.

### Task 19: Weather page

**Files:**
- Create: `src/app/(app)/weather/page.tsx`

Live weather, 7-day forecast, manual weather logs. Remove automation suggestions for now (speculative).

### Task 20: AI Assistant page

**Files:**
- Create: `src/app/(app)/ai/page.tsx`
- Rebuild: chat-interface, message-bubble

Keep Vercel AI SDK + OpenRouter. Update system prompt. Use TanStack Query for context building.

### Task 21: Settings page

**Files:**
- Create: `src/app/(app)/settings/page.tsx`

Account info, data export (JSON + CSV), data import with migration support.

---

## Phase 4: Field Editor v2

### Task 22: Zustand editor store

**Files:**
- Create: `src/lib/stores/editor-store.ts`

Tool state FSM (select, draw-rect, draw-polygon, hand, measure, eraser, utility-node, utility-edge).
Selection state, zoom, pan, grid settings, layer visibility.

### Task 23: Command pattern for undo/redo

**Files:**
- Create: `src/lib/stores/command-history.ts`
- Create: `src/lib/commands/types.ts`
- Create: `src/lib/commands/crop-commands.ts`
- Create: `src/lib/commands/field-commands.ts`

Reversible command objects. History stack. Ctrl+Z / Ctrl+Shift+Z.

### Task 24: Field editor layout — 3-column Figma-style

**Files:**
- Create: `src/app/(app)/fields/[fieldId]/page.tsx`
- Create: `src/components/editor/editor-layout.tsx`
- Create: `src/components/editor/tool-rail.tsx`
- Create: `src/components/editor/canvas-viewport.tsx`
- Create: `src/components/editor/inspector-panel.tsx`
- Create: `src/components/editor/status-bar.tsx`

Left: tool rail. Center: canvas. Right: inspector. Bottom: status bar.

### Task 25: Canvas rendering with react-konva

**Files:**
- Create: `src/components/editor/canvas/field-canvas.tsx`
- Create: `src/components/editor/canvas/grid-layer.tsx`
- Create: `src/components/editor/canvas/crops-layer.tsx`
- Create: `src/components/editor/canvas/utilities-layer.tsx`
- Create: `src/components/editor/canvas/selection-layer.tsx`

All coordinates in meters. Canvas handles meters→pixels conversion.

### Task 26: Tool implementations

**Files:**
- Create: `src/components/editor/tools/select-tool.ts`
- Create: `src/components/editor/tools/draw-rect-tool.ts`
- Create: `src/components/editor/tools/hand-tool.ts`
- Create: `src/components/editor/tools/measure-tool.ts`

Each tool is a state handler. Tool rail switches active tool.

### Task 27: Field list page

**Files:**
- Create: `src/app/(app)/fields/page.tsx`

List all fields. Create new field dialog. Click to open editor.

---

## Phase 5: Cleanup + Migration + Polish

### Task 28: Remove old v1 code

Delete old providers, localStorage hooks, normalization functions, old pages, old components.

### Task 29: Data migration path

**Files:**
- Create: `src/server/actions/migrate.ts`

Import from localStorage JSON export → PostgreSQL tables. For existing users transitioning.

### Task 30: Playwright E2E tests

**Files:**
- Create: `e2e/auth.spec.ts`
- Create: `e2e/dashboard.spec.ts`
- Create: `e2e/crops.spec.ts`
- Create: `e2e/calendar.spec.ts`
- Create: `e2e/field-editor.spec.ts`
- Create: `e2e/records.spec.ts`

Full E2E coverage for all major flows.

### Task 31: Final review and cleanup

Lint, build, type-check. Remove unused dependencies. Verify all routes work.
