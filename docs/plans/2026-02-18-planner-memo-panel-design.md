# Planner Memo Panel Design

Date: 2026-02-18
Related issue: #50
Status: Implementation-ready

## Objective

Add a persistent memo area in Field Planner so users can keep non-structured notes tied to garden planning (facility reminders, path notes, maintenance logs).

## Design

- Add `PlannerMemoPanel` UI in `/field-planner`.
- Persist memo content in local storage key `hualien-planner-memo`.
- Store payload shape:
  - `text`
  - `updatedAt`
- Include `hualien-planner-memo` in scheduled/manual planner backup key list.

## Validation

- Manual: memo remains after reload and app restart.
- Backup integration: memo key captured/restored by existing backup utility tests that validate tracked key coverage.
