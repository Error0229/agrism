# PM Team Log

## Completed: PR #120 Merged (2026-03-17) — Feature Wave
- **PR**: feat/hardening-navigation-0317 → main (#120) — MERGED (squash)
- **Issues**: #114, #115, #116, #117, #118, #119

### #114 Backend Hardening
- 67 `.collect()` → `.take(N)` bounded queries
- 9 mutation validations (field size, task title, quantity, amount)

### #115 Cross-Entity Navigation
- Links in harvest, task, finance records to related crops/fields
- Field context panel in field editor

### #116 Quick Plant Action
- QuickPlantDialog for planting from crop cards and detail page
- Field selection with suitability badges

### #117 Smart Planting Validation
- checkRotationViolation query (field history + time window)
- checkCompanionStatus query (live neighbor cross-reference)
- Warnings in quick-plant, plan-crop dialogs, Smart Crop Card

### #118 AI Context Enrichment
- buildChatContext query aggregating 7 data categories server-side
- Replaces client-side context in AI chat page

### #119 Suitability Persistence
- Schema: suitabilityScore/Constraints/Notes/ComputedAt on plantedCrops
- Compute on plant (plantCrop, assignCropToRegion, createRegion)
- recomputeSuitability mutation
- Expanded suitability in crop detail + field editor property inspector

### Review: 4 parallel reviewers, 3 HIGH fixed, 18 threads resolved
- H1: `as never` → proper `Id<"crops">` types
- H2: Cascade delete loop (prevents orphaned sub-entities)
- H3: Lazy companion/rotation subscriptions in SmartCropCard

## Completed: PR #113 Merged (2026-03-16) — Daily Improvement Cycle
- **PR**: feat/daily-improvement-0316 → main (#113) — MERGED (squash)
- **Process**: Research (3 agents) → Strategist review → Spec + Issues → Implement → QA → Fix → Review (5 agents) → Fix HIGH → Re-review → Merge
- **Issues**: #110, #111, #112

### #112 Resilient API Layer
- `src/lib/fetch-utils.ts` — fetchWithRetry with exponential backoff, 4xx skip, signal combining
- `src/components/query-error-boundary.tsx` — reusable error boundary with zh-TW fallback
- Dashboard: 4 independent error boundaries, weather retry with dedup guard
- API routes: AbortSignal.timeout for chat (30s), Promise.race timeout for weather (10s)
- Toast-based error recovery for all 5 task mutation handlers

### #110 Crop Lifecycle Dashboard Cards
- `src/lib/constants/lifecycle.ts` — shared STAGE_LABELS, STAGE_COLORS, LIFECYCLE_TYPE_LABELS
- `src/components/dashboard/growing-crops-section.tsx` — lifecycle-aware cards with:
  - Color-coded stage badges, lifecycle type icons, segmented 5-stage progress bar
  - Harvest countdown/window, low-confidence attention indicator
  - Loading skeleton, empty state, responsive grid, React.memo
- `convex/fields.ts` — listSummary returns lifecycle fields from plantedCrops

### #111 Harvest Analytics Dashboard
- `src/components/analytics/harvest-analytics.tsx` — first use of recharts in app:
  - Yield Over Time (AreaChart with crop filter)
  - Yield by Field (BarChart, sorted descending)
  - Quality Distribution (DonutChart with grade breakdown)
  - 4 summary stat cards, date range filter (3/6/12 months/all)
  - Unit normalization (斤→kg), filtered-empty state

### Review: 5 parallel reviewers, 3 HIGH fixed, 19/26 threads resolved
- H1: Chat timeout fixed (AbortSignal.timeout instead of broken clearTimeout)
- H2: Weather timeout fixed (Promise.race instead of dead AbortController)
- H3: PlantedCropData = any replaced with proper interface
- 7 MEDIUM/LOW threads remain as non-blocking tech debt

### Commits: 014b20b, d4fd23e, 40854cb, e70458c, 2c96f0a

## Completed: PR #109 Merged (2026-03-15)
- **PR**: feat/sprint-105-108 → main (#109) — MERGED
- **Dashboard task hub UX redesign** (iterative, user-driven):
  - Responsive 3-column grid (was 2-col), removed fullWidth hack
  - Task cards: left-side ButtonGroup (complete ✓ + skip ⏭), consistent button shapes
  - Recommendation cards: distinct footer actions (加入待辦/稍後/忽略), NOT same UI as tasks
  - Source labels as inline badge pills next to title (AI amber, 天氣 sky, 自動 violet)
  - AI reasoning block foldable, default collapsed
  - Better text contrast for accessibility
  - Added shadcn button-group component
- **Backend: promotion data preservation**:
  - Added description, aiConfidence, aiSourceSignals to tasks schema
  - promoteRecommendation carries over summary + recommendedAction + confidence + signals
  - getUnifiedTasks backfills from linked recommendation for pre-existing promoted tasks
- **Review**: All 28 threads resolved, 0 unresolved, build clean
- **Commits**: a15f0bd, e134796

## Completed: PR #109 Review-Fix Loop (2026-03-13)
- 5 parallel reviewers, 2 fix rounds, all CRITICAL/HIGH resolved

## Completed: Issues #105, #106, #107, #108 — Wave 1+2 Sprint (2026-03-12)
- **4 issues implemented, reviewed, QA'd in one session**
- **Total commits**: 12 (4 feat + 4 review fixes + 1 wiring + 1 QA fix + 2 chore)
- **Pipeline per issue**: BA spec → Backend Dev → Frontend Dev → Reviewer → Fixer → QA → QA Fix

### #108 Unified Task Hub (Phase 1)
- Backend: extended tasks table (7 fields), getUnifiedTasks, promoteRecommendation, skipTask, completeTask, dailyLogs table
- Frontend: morning briefing card, unified task stream, quick-add FAB, progress ring
- Review: 4 HIGH fixed (unbounded fetch, non-deterministic query, N+1, duplicated constant)
- QA: 15/16 PASS, 1 BLOCKED (responsive)

### #106 Smart Crop Card
- Backend: getCropCareContext query, enhanced assignCropToRegion, shared/growth-stage.ts pure functions
- Frontend: SmartCropCard (4-layer progressive disclosure), use-crop-care-context hook
- Review: 3 HIGH fixed (any types, duplicate calcs, timezone)
- QA: 8/8 PASS

### #107 Field Journal (Phase 1)
- Backend: fieldJournalEntries + regionJournalEntries tables, CRUD in convex/journal.ts
- Frontend: field-journal.tsx, region-journal.tsx, quick phrase chips, relative timestamps
- Review: 3 HIGH fixed (unbounded collect, broad fallback, content validation)
- QA: 7/8 PASS, 1 minor (button size fixed)

### #105 Succession Unification (P0)
- Backend: getRegionPlan unified query, enhanced create with auto-linking, getRegionHistory
- Frontend: unified vertical timeline, rotation warnings, enhanced plan dialog
- Review: 3 HIGH fixed (same batch as #107)
- QA: 6/6 PASS

## Completed: Issue #101 — Taiwan MOA + EPPO Pest Reference Images (2026-03-10)
- **Agents used**: BA, Backend Dev, Frontend Dev, Reviewer, Fixer
- **Commit**: `2f99bfe` — feat: integrate Taiwan MOA and EPPO pest/disease reference images (#101)
- **BA**: Verified MOA API (103 records, no auth), EPPO API (needs free API key), wrote full spec
- **Backend**: pestReferenceImages table (6 indexes), pestImageImport.ts (MOA batch import with staggered scheduling), pestEppoLookup.ts (on-demand EPPO lookup after triage), pestReferenceImages.ts (queries)
- **Frontend**: pest-reference-gallery.tsx (inline thumbnails + lightbox), pest-reference-detail.tsx (full detail dialog), crop-pest-references.tsx (crop detail integration), library page at /records/pest/library
- **Review findings**: 0 CRITICAL, 3 HIGH (all fixed), 7 MEDIUM (non-blocking), 5 LOW
  - H1: Added compound index (source, sourceId) for efficient lookups
  - H2: Added auth documentation comment (global data, login-only is correct)
  - H3: Added R2 key path sanitization for diagId and eppoCode
- **QA**: Pending (needs browser testing)
- **Note**: EPPO requires `EPPO_API_KEY` env var (free registration). MOA import requires running batch action. Pre-existing build error in plan-crop-dialog.tsx (unrelated).

## Completed: Issue #100 — iNaturalist Field Photo Gallery (2026-03-10)
- **Agents used**: Backend Dev, Frontend Dev, Reviewer, Fixer
- **Commit**: `7ce231e` — feat: add iNaturalist field photo gallery for crop detail pages (#100)
- **Backend**: cropGalleryLookup.ts (iNaturalist API → R2 upload), galleryImages schema, auto-triggers on create/update/approveImport, batch action
- **Frontend**: crop-gallery.tsx (responsive grid, lightbox with keyboard nav, CC attribution, iNaturalist links)
- **Review findings**: 0 CRITICAL, 3 HIGH (all fixed), 7 MEDIUM (non-blocking), 4 LOW
  - H1: Added scientificName validation regex (defense-in-depth)
  - H2: Added gallery auto-trigger to update mutation (was missing)
  - H3: Removed galleryImages from optionalCropFields (prevent client injection)
  - M4: Removed dead LICENSE_LABELS map from frontend
- **QA**: Pending (no browser testing yet)

## Completed: Issue #99 — Crop Images from Wikimedia Commons (2026-03-09)
- **Team**: `agrism-crop-redesign`
- **Agents used**: backend-crop-media, frontend-crop-media, qa-crop-creation, reviewer-issue99, fixer-critical
- **R2 config**: bucket=agrism-crop-media, public URL=https://media.agrism.catjam.dev
- All 16 default crops uploaded to R2 as WebP (3 sizes: thumb 64x64, medium 300x300, large 800px)
- Auto image lookup for user-added crops via Wikidata SPARQL (convex/cropImageLookup.ts)
- Review found CRITICAL: largeImageUrl not in schema, seedDefaults on every page load, lastVerified type mismatch in cropImport.ts
- All CRITICAL/HIGH issues fixed, build passes

## Completed: Issues #89/#90 — Evidence-Backed Crop Import + Review (2026-03-08)
- Backend agent: schema changes (fieldMeta, importStatus), cropImport.ts, approve/reject mutations
- Frontend agent: smart-add dialog enhancement, crop import review component, hooks

## Completed: Issues #96/#97 — Irrigation + Pest Triage (2026-03-08)
### #96 Commits
- `eae2e13` — feat: irrigation zone management with AI-powered watering advice (#96)

### #97 Commits
- `ba18243` — feat: pest and disease triage assistant with AI diagnosis (#97)

### Features
- Irrigation: zone CRUD, mark watered/skipped, AI watering advice, panel on weather page
- Pest: observation CRUD with severity/affected parts, AI triage (3-5 possible causes), resolve workflow
- Both use OpenRouter `google/gemini-3.1-flash-lite-preview` model

## Completed: Issues #93-#95 — AI Briefing + Feedback + Weather Replan (2026-03-08)
### Commits
- `5e0819b` — feat: AI daily briefing with recommendation engine (#93)
- `117afd1` — feat: daily briefing cards on dashboard with AI generation (#93)
- `27c2e4d` — feat: inline crop editing on detail page
- `6529e3a` — feat: recommendation feedback loop with history and AI learning (#94)
- `bf58c7d` — feat: weather-triggered replan proposals with 7-day forecast (#95)

## Completed: Issue #92 — Crop-Field Suitability Engine (2026-03-08)
### Commits
- `bd98b0b` — feat: crop-field suitability engine with matching rules (#92)
- `67c58e1` — feat: suitability display in crop detail and planning views (#92)
- `a10d0fd` — fix: growth stage labels and completeness percentage on crop detail (#98)

## Previous: Issue #88 — Occupancy and Succession Planning (2026-03-08)
- Team: `agrism-crop-redesign`

### Commits
- `8e2c3d8` — feat: overlap detection, succession chain, and auto-predecessor (#88)
- `5827174` — feat: succession UI with overlap warnings and chain display (#88)
- `b92250a` — fix: dialog stale state, redundant occupancy build, type mismatch (#88)

### Features
- Overlap detection query (checkOverlap) warns when planned plantings conflict
- Succession chain query + visual timeline in region inspector
- Auto-fill start window from predecessor's end when planning successor
- Perennial/orchard crops blocked from succession planning
- Red overlap indicators on season board
- Predecessor info banner in plan crop dialog

### Review Findings (fixed)
- PlanCropDialog stale state on re-open → added useEffect reset
- Redundant buildFieldOccupancy in create → direct predecessor lookup
- Type mismatch for predecessorPlantedCropId → proper Id type

### Browser QA: PENDING (browser extension unavailable)

## Previous: Issue #98 — Crop Detail Page Redesign (2026-03-07)
- Team: `agrism-crop-redesign`

### #98 Additional Commits
- `cbdf4a8` — feat: embed full enriched seed data in DEFAULT_CROPS (#98)
- `aea171c` — chore: switch OpenRouter model to gemini-3.1-flash-lite-preview (#98)
- `dc8afb4` — feat: wire up AI enrichment button on crop detail page (#98)
- `026dd20` — feat: wire up smart add with AI enrichment on crop list (#98)

### #98 Original Commits
- `b4ab3bc` — feat: rebuild crops table with professional 60+ field schema (#98)
- `110cfaf` — refactor: replace crop detail page with minimal placeholder (#98)
- `f540b22` — feat: AI enrichment backend (7-pass structured output via OpenRouter)
- `6296ceb` — feat: redesign crop detail page with dense, professional layout (#98)
- `4f580c3` — feat: upgrade crop list page with richer cards and smart add (#98)
- `c05dff3` — fix: use internal query for batch enrichment + trigger seed (#98)
- `dc23250` — fix: add auth checks to public enrichment actions + fix TS error (#98)

### AI Enrichment Results
- 59/60 default crops enriched across 4 farms (1 failed due to OpenRouter credits)
- 7-pass structured output: identity/timing, environment/soil, spacing/water, pest/disease, companion/harvest, growth stages, growing guide
- Model: anthropic/claude-3.5-sonnet via OpenRouter

### Browser QA: PASS (5/5)
1. Crop list page — rich cards with calendar bars, category tabs, search ✅
2. Crop detail page — hero, calendar, growth stages, environment grid ✅
3. AI enrichment data populated correctly ✅
4. Navigation list ↔ detail ✅
5. Build + deploy clean ✅

### Minor Issues Noted (not blockers)
- Water level "high" shows raw instead of Chinese label (label map mismatch)
- Growth stage names mix English/Chinese (AI returns custom stage names not in label map)
- Completeness ring shows 103% (hardcoded totalFields=60 slightly low)

## Previous: Sprint 3 fixes (2026-03-07)
- Team: `agrism-fixes`

### Fix Commits
- `b511c98` — feat: add lifecycleType field to crops table and mutations
- `fd80a58` — fix: calculate estimated end dates in getFieldOccupancy
- `456a574` — feat: editable area names + fix overlap detection (growing-only filter)
- `5979749` — fix: show lifecycleType as read-only from crop in inspector

## Sprint 3 Feature Commits (2026-03-07)
- `b4bd946` — feat: planned planting model and occupancy logic (#87)
- `be90503` — feat: location-aware agronomy profiles with geography-keyed resolver (#91)
- `6d45fd8` — feat: crop detail provenance display with scope badges (#91)
- `87069fc` — feat: season board and field-first planner UI (#87)
- `6cdb015` — fix: N+1 query in occupancy + duplicate fetch in resolved facts
- `ab4a8c9` — fix: farm override creates farm-scope profile instead of modifying base (#91)
- `852b18c` — fix: prevent Konva crash when toggling to season planner view (#87)

## Previous: Sprint 2 (2026-03-06)
### Commits
- `5b604bd` — feat: crop knowledge schema v3 with layered profiles (#86)
- `2507c6d` — feat: onboarding flow for existing plantings (#84)
- `7b281e9` — feat: crop detail page with profiles and provenance (#86)
