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
- Inspector redesign (split area/crop, simplified dates)
- Sidebar polish (drag-reorder, scroll fix, handle positioning)
- Unit tests (47+ total across 9+ files)

## Upcoming (from GitHub issues)
- **#89** Evidence-Backed Crop Import (depends on #86 ✅, partially superseded by #98)
- **#90** Crop Import Review Workflow (depends on #86 ✅)
- **#93-#97** AI Layer (Daily Briefing, Feedback Loop, Weather Replan, Irrigation, Pest Triage)

## Blocked
(None currently)

## Notes
- cropProfiles table deleted — replaced by flat fields on crops table (#98)
- AI 補充知識 button wired up (commit dc8afb4), 智慧新增 button wired up (commit 026dd20)
- Suitability engine: convex/suitability.ts with computeSuitability pure function
- Minor cosmetic issues from #98: water label map mismatch, growth stage English names, completeness % slightly off
