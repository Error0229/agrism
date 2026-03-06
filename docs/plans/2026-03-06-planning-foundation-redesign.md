# Planning Foundation Redesign

Date: 2026-03-06
Status: Drafted for implementation
Related issues: #84, #85, #87, #88

## Goal

Redesign planning so the product works for a real private farm with:

- many already-existing plantings
- fuzzy memory about exact planting dates
- mixed short-cycle and long-lived crops
- field-first thinking rather than day-first thinking

The planner should help the user answer:

- what is growing now
- what this area probably is in its lifecycle
- when this area becomes available
- what can be planted next

This redesign is intentionally about planning foundation, not AI polish.

## 1. Current pain points

### 1.1 Exact-date bias

Current planning and task generation assume a crop has a meaningful `plantedDate`.

That breaks down during onboarding because a farmer often only knows:

- roughly which month it was planted
- whether the crop is still young, mature, fruiting, or near harvest
- that a tree or perennial has been there for a long time

### 1.2 Calendar-first workflow

The current flow pushes the user into specific dates and daily task editing too early.

For real farm work, the primary workflow is:

1. look at a field area
2. decide what is there now
3. estimate what stage it is in
4. decide what should happen next in that area

The calendar should be a detail view, not the top-level planning model.

### 1.3 No meaningful occupancy or succession model

Today the product can show planted regions and tasks, but it does not yet treat regions as occupied for uncertain time windows or make succession planning a first-class concept.

### 1.4 Seasonal and perennial crops are mixed together

The planner currently lacks a strong semantic distinction between:

- short-cycle seasonal crops
- long-cycle annual crops
- perennial/orchard crops
- infrastructure/fixed non-plant areas

That makes “what can go here next” much less reliable than it needs to be.

## 2. Product principles

### 2.1 Prefer honest uncertainty to fake precision

If the user only knows “around last November,” the product should store and display that as an estimate, not force a fake exact date.

### 2.2 Field state comes before task state

Tasks are downstream artifacts. The planner should primarily model land use and crop lifecycle.

### 2.3 Current truth and future intent are different things

The data model should separate:

- `current plantings`
- `planned plantings`
- `recommendations`
- `tasks`

These should not be collapsed into one table or one UI list.

### 2.4 The system must work for partial memory

The user should be able to incrementally improve data quality over time.

## 3. Target workflows

## 3.1 Workflow A: onboarding an already-planted farm

1. User opens field map.
2. User marks or draws the current planted areas.
3. For each area, user sets:
   - crop
   - lifecycle type
   - current stage
   - planting certainty
   - optional rough start window
4. System estimates:
   - likely planting window
   - likely harvest/end window
   - confidence
5. User can accept or adjust the estimate.

Key rule:
The flow must not require exact date entry to complete onboarding.

## 3.2 Workflow B: planning the next season

1. User selects an area on the field map.
2. System shows:
   - current occupant
   - estimated end window
   - follow-on constraints
   - candidate future windows
3. User adds a planned crop with a rough start window.
4. System creates a planned occupancy block before any exact calendar tasks exist.

## 3.3 Workflow C: refining exact timing later

Once the user gains clarity, a rough plan can later be turned into:

- a narrower start window
- an exact planting date
- generated care/harvest tasks

This keeps the workflow progressive instead of forcing precision up front.

## 4. Data model recommendation

## 4.1 Extend planted crop lifecycle semantics

`plantedCrops` should evolve from a minimal placement record into a real lifecycle record.

Recommended additions:

- `lifecycleType: "seasonal" | "long_cycle" | "perennial" | "orchard"`
- `stage: string`
- `stageConfidence: "high" | "medium" | "low"`
- `startDateMode: "exact" | "range" | "relative" | "unknown"`
- `plantedDate` for exact mode
- `plantStartEarliest`
- `plantStartLatest`
- `estimatedAgeDays`
- `timelineConfidence: "high" | "medium" | "low"`
- `endWindowEarliest`
- `endWindowLatest`
- `isOccupyingArea: boolean`

Notes:

- `plantedDate` should remain for backward compatibility.
- range fields should be optional.
- confidence fields should be explicit, not inferred from nullability.

## 4.2 Add a distinct planned planting model

Do not overload `tasks` for future crop plans.

Introduce a new concept such as `cropPlans` or `plannedPlantings` with:

- target field/region
- cropId
- planningState: `draft | confirmed | cancelled | completed`
- start window earliest/latest
- end window earliest/latest
- predecessorPlantedCropId or predecessorPlanId
- notes
- confidence

This allows the system to represent “I want tomatoes here after the current crop finishes” without pretending it is already planted or immediately creating date-specific tasks.

## 4.3 Treat occupancy as a first-class derived concept

The planner should derive an occupancy view from:

- current planted crops
- planned plantings
- lifecycle type
- estimated end windows

That occupancy model is what blocks overlaps and powers succession hints.

## 5. UI architecture recommendation

## 5.1 Replace day-first entry with field-first entry

Primary planning entry points should become:

- `現在田況`
- `下一季規劃`
- `區域可用性`

The calendar remains useful, but as a drill-down layer.

## 5.2 Add a lightweight season board

The board should show 3-6 months at a coarse level, with rough windows like:

- 上旬
- 中旬
- 下旬
- month ranges

This is more appropriate than exact days for early planning.

## 5.3 Region inspector changes

When a region is selected, the inspector should show:

- current crop
- lifecycle type
- current stage
- planting certainty
- estimated time window
- planned successor
- notes

This becomes the main manual editing surface.

## 6. Planning rules to support in v1

The first implementation should support these rules before any advanced AI:

- current region occupied until estimated end window
- perennial/orchard areas do not show as freely reusable
- planned planting cannot overlap an occupied window without explicit override
- current stage can narrow suggested end window
- if certainty is low, UI must visually communicate uncertainty

## 7. Migration strategy

Existing planted crops should migrate safely:

- if `plantedDate` exists:
  - `startDateMode = exact`
  - confidence defaults to high
- if no `plantedDate` exists:
  - `startDateMode = unknown`
  - timeline confidence defaults to low
  - user can later enrich the record

No existing field geometry or placement data should be discarded.

## 8. Sequencing recommendation

1. add lifecycle + uncertainty fields to planted crops
2. update field editor inspector and crop assignment flows
3. add onboarding flow for uncertain historical plantings
4. add planned planting model
5. add season board and occupancy layer
6. connect task generation only after plan confirmation or exact timing exists

## 9. Validation

### Unit tests

- migration of existing planted crop records
- occupancy calculation with exact and estimated windows
- succession blocking rules
- perennial exclusion from reusable space

### Manual checks

- onboard a field with mostly unknown dates
- convert one uncertain planting into an exact record later
- plan a successor crop after current occupancy
- confirm that calendar remains usable after the field-first redesign

## 10. Key implementation guardrails

- Do not treat estimated dates as exact in downstream UI.
- Do not auto-generate dense task schedules from low-confidence lifecycle data without explicit user confirmation.
- Do not store future crop intentions only as free-text notes.
- Do not make the planner depend on AI before the manual workflow is solid.
