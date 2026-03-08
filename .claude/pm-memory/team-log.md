# PM Team Log

## In Progress: Issue #93 — AI Daily Briefing (2026-03-08)
- Backend done: recommendations table, context builder, AI generation
- Frontend: dashboard briefing cards (in progress)

### #93 Commits
- `5e0819b` — feat: AI daily briefing with recommendation engine (#93)

## Also Completed: Crop Detail Editing (2026-03-08)
- `27c2e4d` — feat: inline crop editing on detail page

## Also Completed: Issue #92 — Crop-Field Suitability Engine (2026-03-08)
### #92 Commits
- `bd98b0b` — feat: crop-field suitability engine with matching rules (#92)
- `67c58e1` — feat: suitability display in crop detail and planning views (#92)

### Cosmetic Fixes
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
