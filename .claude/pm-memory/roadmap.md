# PM Roadmap

## Current Status
- Project: Agrism (Hualien Vegetable & Fruit Growing Guide)
- Stage: Active development, no real users yet
- Branch: main

## Completed
- **#83** Farm Location Profile — schema, mutation, settings UI
- **#85** Planted Crop Lifecycle Model — schema, mutation, inspector UI
- **#84** Onboard Existing Plantings — onboarding flow with uncertain dates
- **#86** Crop Knowledge Schema v3 — profiles, facts, provenance, crop detail page
- **#87** Field-First Season Planner — planned planting model, occupancy logic, season board UI, region inspector
- **#91** Location-Aware Profiles — geography-keyed profiles, resolver, migration, provenance display, farm overrides
- **#98** Crop Detail Page Redesign — 60+ field schema, AI enrichment (7-pass), dense detail page, rich list cards, full seed data
- **#88** Occupancy and Succession Planning — overlap detection, succession chains, auto-predecessor, perennial guards
- **#92** Crop-Field Suitability Engine — 5 constraint checks, suitability display in crop detail + planning
- **#93** AI Daily Briefing — recommendation schema, context builder, dashboard cards, AI generation
- **#94** Recommendation Feedback Loop — dismiss reason, history view, AI learning from feedback
- **#95** Weather-Triggered Replan — 7-day forecast, weather-specific proposals, dashboard button
- **#96** Irrigation Advisor — zone CRUD, AI watering advice, irrigation panel on weather page
- **#97** Pest Triage Assistant — observation CRUD, AI diagnosis, pest page with triage results
- **#89** Evidence-Backed Crop Import — 4-pass AI research with per-field confidence, fieldMeta, draft status
- **#90** Crop Import Review Workflow — review page with confidence badges, edit-before-save, required field gating
- Crop Detail Inline Editing — edit mode with all 60+ fields
- Inspector redesign (split area/crop, simplified dates)
- Sidebar polish (drag-reorder, scroll fix, handle positioning)
- Unit tests (47+ total across 9+ files)

## Completed (continued)
- **#99** Crop Images from Wikimedia Commons — R2 storage, auto-lookup, 16 default crops
- **#100** iNaturalist Field Photo Gallery — gallery pipeline, R2 upload, lightbox UI, CC attribution
## Completed — Wave 1 + Wave 2 (QA passed)
- **#108** Unified Task Hub Phase 1 — QA: 15/16 PASS. Tasks schema, unified query, morning briefing card, task stream, quick-add FAB, recommendation promotion
- **#106** Smart Crop Card — QA: 8/8 PASS. Auto-populate, getCropCareContext, 4-layer progressive disclosure, growth stage progress, override UX
- **#107** Field Journal Phase 1 — QA: 7/8 PASS. 2 journal tables, CRUD, category chips + quick phrases, field + region tiers, timeline display
- **#105** Succession Unification P0 — QA: 6/6 PASS. Unified timeline, auto-link, rotation warnings, plan dialog with predecessor context

## Completed — Feature Wave (2026-03-17)
- **#114** Backend Hardening — 67 bounded queries, 9 mutation validations
- **#115** Cross-Entity Navigation — links in harvest/task/finance to crops/fields
- **#116** Quick Plant Action — plant from crop cards/detail page
- **#117** Smart Planting Validation — rotation + companion/antagonist warnings
- **#118** AI Context Enrichment — server-side farm data aggregation for AI chat
- **#119** Suitability Persistence — cached scores, constraint explanations in editor

## Completed — Daily Improvement (2026-03-16)
- **#112** Resilient API Layer — error boundaries, fetchWithRetry, API timeouts, toast error recovery
- **#110** Crop Lifecycle Dashboard Cards — stage progress bars, harvest countdown, lifecycle badges
- **#111** Harvest Analytics Dashboard — yield trends (AreaChart), field comparison (BarChart), quality distribution (DonutChart), summary stats

## Future Phases (after P0/Phase 1 of all 4 ship)
- **#105** P1-P3: smart suggestions, season board enhancements, quick replan
- **#106** Phases 2-3: contextual alerts, growth stage tips
- **#107** Phases 2-5: cross-linking, photos, voice input
- **#108** Phases 2-6: end-of-day summary, weekly review, offline support

## Implementation Notes
- Merge order for `property-inspector.tsx`: #106 → #107 → #105 (different line ranges, sequential merge avoids conflicts)
- #108 is fully independent (dashboard only, no field editor overlap)
- Schema changes are all additive and non-conflicting

## Closed (Not Planned)
- **#101** Taiwan MOA + EPPO Pest Reference Images — rolled back; TARI image server down, wrong UX approach (farmers need symptom-based identification, not pest body photos). Consider Pl@ntNet integration instead.

## Blocked
(None currently)

## Notes
- cropProfiles table deleted — replaced by flat fields on crops table (#98)
- AI 補充知識 button wired up (commit dc8afb4), 智慧新增 button wired up (commit 026dd20)
- Suitability engine: convex/suitability.ts with computeSuitability pure function
- Minor cosmetic issues from #98: water label map mismatch, growth stage English names, completeness % slightly off
