# Farmer Breadth Unresolved Issues Design

Date: 2026-02-18
Status: Drafted for implementation
Source: `docs/plans/2026-02-17-farmer-feature-breadth-design.md`
Related issues: #17, #18, #19, #20, #21, #22, #23, #24

## Goal

Translate unresolved breadth features into implementation-ready technical plans with schema, UX, planner, and test strategy details.

## Issue #17 - Field Context Profile for Plots

### Objective

Capture per-field context inputs so planning logic can reason about sun, drainage, wind, and terrain constraints.

### Current Gap

- `Field` only stores name, dimensions, and planted crops.
- Planner utilities cannot account for microclimate/terrain constraints.

### Proposed Design

- Extend `Field` with `context`:
  - `plotType`: `"open_field" | "raised_bed" | "container" | "greenhouse"`
  - `sunHours`: `"lt4" | "h4_6" | "h6_8" | "gt8"`
  - `drainage`: `"poor" | "moderate" | "good"`
  - `slope`: `"flat" | "gentle" | "steep"`
  - `windExposure`: `"sheltered" | "moderate" | "exposed"`
- Add field defaults on create and migration fallback on existing local storage.
- Update field create/edit dialog to support context selection.
- Feed context into planner interfaces (`generatePlantingSuggestions`, task prioritizer explanation metadata).

### Data Compatibility

- Add defensive normalizer when loading fields from storage:
  - Missing/invalid `context` gets default values.
- Ensure event replay works without context in historical events by normalizing the final field state.

### Test Plan

- Unit test field normalizer for legacy field objects.
- Unit test planner utility path that consumes field context and emits explanatory reason text.

### Risks

- Existing UI state may assume shallow field updates; verify partial update merges do not drop context.

## Issue #18 - Soil Profile and Amendment History Model

### Objective

Move from free-text soil notes to structured soil profile data that the planner can consume.

### Current Gap

- Soil data exists as notes only (`SoilNote.content`, optional `ph`).
- No structured EC, organic matter, texture, or amendment history.

### Proposed Design

- Add `soilProfile` per field:
  - `texture`: `"sand" | "loam" | "clay" | "silty" | "mixed"`
  - `ph`: number | null
  - `ec`: number | null
  - `organicMatterPct`: number | null
  - `updatedAt`: ISO string
- Add amendment history record:
  - `id`, `fieldId`, `date`, `amendmentType`, `quantity`, `unit`, `notes`.
- Keep existing `SoilNote` for narrative context.
- Provide planner-facing projection:
  - `soilRiskFlags` (acidic/alkaline/salinity/low-organic-matter hints).

### UI Changes

- Add structured soil profile card in farm management soil tab.
- Add amendment entry form and recent amendment table.

### Test Plan

- Unit tests for profile validation/coercion and numeric bounds.
- Unit tests for soil risk flag projection.
- Storage migration tests from old shape to new profile defaults.

### Risks

- Overly strict validation may block valid farmer input; clamp + warn instead of hard reject where possible.

## Issue #19 - Task Effort Model with Workload Bottleneck Forecast

### Objective

Attach effort semantics to tasks and expose workload bottleneck warnings.

### Current Gap

- Task schema has no effort, difficulty, or tool requirements.
- Dashboard cannot forecast workload or over-capacity periods.

### Proposed Design

- Extend `Task` with:
  - `effortMinutes?: number`
  - `difficulty?: "low" | "medium" | "high"`
  - `requiredTools?: string[]`
- Implement `forecastWorkload(tasks, config)` utility:
  - Aggregate effort per day/week over configurable horizon.
  - Compute utilization against `dailyCapacityMinutes`.
  - Emit `bottlenecks` with reason metadata.
- Add dashboard card showing:
  - next 7-day planned minutes
  - top bottleneck day
  - quick explanation.

### Data Compatibility

- Existing tasks without effort default via type-based heuristics in forecast only.

### Test Plan

- Unit tests for aggregation, fallback heuristics, and threshold crossing.
- Edge tests for completed tasks and past-due tasks behavior.

### Risks

- Wrong default effort values can erode trust; include explanation source (`user`, `heuristic`, `fallback`).

## Issue #20 - Harvest Forecast with Uncertainty Bands

### Objective

Provide probabilistic harvest windows instead of single-point countdowns.

### Current Gap

- Existing harvest countdown uses fixed growth day logic.
- No uncertainty display tied to weather confidence or risk.

### Proposed Design

- Add utility `forecastHarvestWindow(plantedCrop, crop, signals)` returning:
  - `earliestDate`, `likelyDate`, `latestDate`
  - `confidence`: `"high" | "medium" | "low"`
  - `factors`: explanation strings.
- Inputs include:
  - crop growth days
  - crop stage/pest risk profile
  - weather freshness/confidence from existing weather layer.
- Surface in dashboard harvest module and crop timing dialog summary.

### Degradation Strategy

- If weather confidence unavailable, widen range and set confidence to `low` with clear reason.

### Test Plan

- Unit tests for baseline forecast and adverse weather widening behavior.
- Unit tests for confidence downgrade when signals are stale.

### Risks

- Forecast complexity can be opaque; always attach factor list in UI tooltips.

## Issue #21 - Automation Rules for Weather Anomalies and Replan Triggers

### Objective

Add rule-driven automation recommendations for anomaly conditions and key assumption changes.

### Current Gap

- Severe weather alerts exist, but schedule changes are mostly manual.
- No centralized replan trigger evaluator.

### Proposed Design

- Introduce `automation/rules` module:
  - `evaluateWeatherAnomalies(alerts, weather, tasks, fields)`
  - `evaluateReplanTriggers(prevInputs, nextInputs)`
- Rule outputs:
  - suggested task adjustments (`delay`, `add`, `prioritize`)
  - explanation and confidence
  - `requiresConfirmation` boolean.
- Beginner profile:
  - conservative defaults turned on by opt-in flag in user settings/local storage.

### Safety Constraints

- No destructive task mutation without explicit user confirmation.
- Suggestions are idempotent by deterministic rule id.

### Test Plan

- Unit tests for typhoon/heavy-rain/no-rain paths.
- Unit tests verifying no-op when signal quality is insufficient.

### Risks

- Alert noise can overwhelm users; include simple suppression/cooldown per rule id.

## Issue #22 - Farm-Wide CSV/JSON Import Export

### Objective

Enable complete farm data portability, backup, and restore workflows.

### Current Gap

- Only crop templates support JSON import/export.
- No farm-wide schema version package.

### Proposed Design

- Add `exportFarmData()`:
  - package fields, tasks, crop templates/custom crops, farm logs, metadata (`version`, `exportedAt`).
- Add `importFarmData(payload, mode)`:
  - mode: `"merge"` or `"replace"`
  - validate each dataset via normalizers.
- CSV export helpers:
  - tasks, harvest logs, finance, weather logs.
- Add import/export panel under farm management settings.

### Validation and Migration

- Keep backward compatibility with missing optional sections.
- Unknown future sections ignored with warning list.

### Test Plan

- Unit tests for schema validation and merge/replace semantics.
- Round-trip test: export then import yields equivalent normalized state.

### Risks

- Large JSON payloads in browser memory; stream-like handling can be deferred but avoid deep cloning loops.

## Issue #23 - Outcome Logs with Quality Pest and Weather Impact

### Objective

Capture richer farming outcomes to improve planning explanations and retrospective analysis.

### Current Gap

- Harvest logs track quantity/unit/notes only.
- No structured quality grade, pest incidents, or weather impact tags.

### Proposed Design

- Extend `HarvestLog`:
  - `qualityGrade?: "A" | "B" | "C" | "reject"`
  - `pestIncidentLevel?: "none" | "minor" | "moderate" | "severe"`
  - `weatherImpact?: "none" | "heat" | "rain" | "wind" | "cold" | "mixed"`
- Add summary utility:
  - quality distribution
  - weather impact frequency
  - pest incident trend.
- Integrate summary into farm management dashboard cards.

### Data Compatibility

- Old records default to null/`none` at read time; do not rewrite history unless edited.

### Test Plan

- Unit tests for summary aggregation and null-safe behavior.
- Migration tests for old records.

### Risks

- Manual quality grading subjectivity; keep values coarse and optional.

## Issue #24 - External Data Expansion Market Climate and Sensor Adapter Path

### Objective

Extend integration layer with adapter contracts beyond weather while preserving provider isolation.

### Current Gap

- Weather adapter exists.
- No contracts for climate dataset, market price data, or sensor-style feeds.

### Proposed Design

- Define adapter interfaces:
  - `ClimateProvider`
  - `MarketPriceProvider`
  - `SensorSnapshotProvider`
- Standardize normalized envelope:
  - `source`, `fetchedAt`, `freshness`, `confidence`, `payload`.
- Implement mock providers and stub service orchestration.
- Keep UI consumption provider-agnostic through integration service responses.

### Reliability Rules

- Adapter failures must not break local planner core.
- Each response includes stale/missing status and fallback note.

### Test Plan

- Unit tests for normalization and confidence/freshness propagation.
- Failure-path tests validating graceful degradation.

### Risks

- External provider contracts may evolve; isolate raw field mapping in adapter layer only.

## Sequencing

1. M1 first: #17, #18.
2. M2 next: #19, #20, #21.
3. M3 after M2 required items: #22, #23, #24.

## Validation Baseline for Each Issue

- `bun run lint`
- `bunx tsc --noEmit`
- `bun test`
