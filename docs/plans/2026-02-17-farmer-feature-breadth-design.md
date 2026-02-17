# Farmer App Feature Breadth Design

Date: 2026-02-17
Status: Approved in chat
Scope: Breadth-first feature design for usefulness across beginner/intermediate/advanced farmers, with user-controlled feature enablement.

## 1. Product Direction

- Optimize for usefulness over UI polish in this phase.
- Keep all major features visible by default.
- Let users control enabled features (no hard hiding as default behavior).
- Target users: all levels, with first optimization for small home growers.
- Farming style support: open field, containers/small area, mixed, and organic-first assumptions.

## 2. Delivery Workflow (GitHub)

- Project management model:
  - Milestones + Labels only (no strict sprint process).
- Milestones:
  - `M1 - Crop Intelligence Foundation`
  - `M2 - Planning Intelligence`
  - `M3 - External Data & Reliability`
- Labels:
  - Type: `type:feature`, `type:infra`, `type:data`, `type:docs`
  - Priority: `prio:p0`, `prio:p1`, `prio:p2`
  - Track: `track:crop-model`, `track:planning`, `track:integration`
  - Status: `status:ready`, `status:blocked`, `status:needs-review`

## 3. Breadth-First Feature Pool

### 3.1 Data Inputs

- Crop attribute packs (growth, spacing, water, nutrient, disease/pest risk, climate tolerance).
- Field context (plot type, sun hours, drainage, slope, wind exposure).
- Soil profile (texture, pH, EC, organic matter, amendment history).
- Task effort model (time, difficulty, tool requirements).
- Outcome logs (yield, quality, pest events, weather impact).
- Cost/revenue basics (seed/input cost, labor estimate, selling price).

### 3.2 Decision Outputs

- Planting window recommendations.
- Weekly action prioritization.
- Rotation and succession guidance.
- Companion conflict checks.
- Harvest forecast with uncertainty.
- Workload forecast and bottleneck warnings.

### 3.3 Automation

- Auto task generation on planting.
- Auto schedule adjustments on weather anomalies.
- Smart reminders and rule-based alerts.
- Replan trigger when key assumptions change.
- Optional beginner defaults.

### 3.4 Integrations

- Weather forecast/current/history APIs.
- Severe weather alerts.
- Climate/open datasets.
- Market price feeds (optional).
- Import/export (CSV/JSON).
- Sensor-ready adapter path for future hardware integration.

## 4. Architecture and Components (for upcoming implementation)

- Data model layer:
  - Extend crop schema and support migration of existing local data.
- Planning engine layer:
  - Separate recommendation logic from UI components.
  - Add explanation metadata to each recommendation.
- Integration layer:
  - Provider adapter interface for weather and future data sources.
  - Data freshness/confidence metadata normalized at adapter boundary.
- UI integration layer:
  - Consume planning outputs and confidence metadata without hard-coding provider logic.

## 5. Data Flow

- User edits crop/field/task data -> local store persists in localStorage.
- Planning engine reads normalized crop + field + task + weather data.
- Engine outputs prioritized tasks, warnings, and recommended windows.
- UI displays outputs plus explanation and confidence status.

## 6. Error Handling and Reliability

- API failures must not block core local planning features.
- Missing external data should degrade gracefully with "stale/missing" status.
- Backward-compatible schema migration for existing stored crop records.

## 7. Testing Strategy (minimum)

- Unit tests for:
  - Schema validation/migration.
  - Planning priority ranking rules.
  - Integration adapter normalization.
- Scenario tests for:
  - Delay simulation behavior.
  - Severe weather alert impact on planning outputs.
- Manual regression checks for localStorage data compatibility.

## 8. Prioritized 9-Issue Backlog (Mixed Delivery)

### M1 - Crop Intelligence Foundation

1. Extensible Crop Schema v2
   - Labels: `type:data`, `track:crop-model`, `prio:p0`, `status:ready`
   - Acceptance: editable agronomy fields + backward-compatible migration.
2. Weather Data Adapter Layer
   - Labels: `type:infra`, `track:integration`, `prio:p0`, `status:ready`
   - Acceptance: unified weather interface + mock provider.
3. Weekly Action Prioritizer
   - Labels: `type:feature`, `track:planning`, `prio:p0`, `status:ready`
   - Acceptance: ranked weekly tasks with urgency/impact/risk explanation.

### M2 - Planning Intelligence

4. Crop Stage Profiles
   - Labels: `type:feature`, `track:crop-model`, `prio:p1`, `status:ready`
   - Acceptance: stage-based needs available to planner.
5. Planting Window + Delay Simulator
   - Labels: `type:feature`, `track:planning`, `prio:p1`, `status:ready`
   - Acceptance: suggested window + delay impact simulation.
6. Severe Weather Alert Pipeline
   - Labels: `type:feature`, `track:integration`, `prio:p1`, `status:ready`
   - Acceptance: alert ingestion + warning/action generation.

### M3 - External Data & Reliability

7. User Crop Templates
   - Labels: `type:feature`, `track:crop-model`, `prio:p1`, `status:ready`
   - Acceptance: template save/load + JSON import/export.
8. Rotation + Companion Rule Checker
   - Labels: `type:feature`, `track:planning`, `prio:p1`, `status:ready`
   - Acceptance: detect conflicts and recommend alternatives.
9. Data Freshness + Confidence Scoring
   - Labels: `type:infra`, `track:integration`, `prio:p1`, `status:ready`
   - Acceptance: source freshness/reliability shown in recommendation outputs.

## 9. GH CLI Execution Plan

- Create labels first.
- Create milestones.
- Create the 9 issues with labels and milestone assignment.

Note: this repository currently requires valid `gh` authentication before issue creation can succeed.

## 10. Transition

- The next step is implementation planning per issue.
- The `writing-plans` skill referenced by brainstorming guidance is not available in the current skill list; fallback is to generate implementation plans directly in issue bodies and/or `docs/plans/` files.

