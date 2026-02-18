# M4 Garden Mapping & Persistence Design

Date: 2026-02-18
Status: Drafted for implementation
Related issues: #34, #35, #36, #37, #38, #39, #40

## Goal

Implement the next field-planner wave for庭園管理:

- support ornamental and facility categories
- keep planning and memo data resilient across app versions
- support richer region geometry and editing
- bootstrap from map/blueprint images
- provide an infinite horizontal timeline over planner history

---

## Issue #34 - Planner Category Expansion: Ornamental and Infrastructure Zones

### Objective

Expand the category model so planner regions can represent觀賞植物 and non-plant fixed facilities.

### Current Gap

- `CropCategory` currently only models edible crop groups.
- Rotation/companion logic assumes all categories are rotation-eligible crops.
- Planner map has no first-class facility semantics.

### Proposed Design

1. Extend category enum:
   - add `花草園藝`
   - add `其它類`
2. Add optional facility metadata for planted-region records:
   - `facilityType?: "water_tank" | "motor" | "road" | "tool_shed" | "house" | "custom"`
   - `facilityName?: string`
   - enforce that `facility*` only applies when category is `其它類`
3. Add helper predicates:
   - `isPlantingCategory(category)` for rotation/companion/planning features
   - `isInfrastructureCategory(category)` for facility rendering and filtering
4. Update UI:
   - crop creation/edit/category filters
   - field legend and region labels
   - quick tag chips for `其它類` facilities

### Migration Strategy

- Existing local records default to no facility metadata.
- Any unknown category string normalizes to previous safe default category and logs warning.

### Testing

- unit: category normalizer and infrastructure predicate
- unit: rotation checker ignores `其它類`
- regression: existing crops still render correctly in list/search/detail

### Risks

- Hard-coded category lists in multiple modules can drift.
- Mitigation: centralize category constants/predicates in one module.

---

## Issue #35 - Versioned Planner and Memo Persistence with Scheduled Backups

### Objective

Prevent planner/memo loss on upgrades and provide periodic backup automation.

### Current Gap

- local storage keys contain live state only.
- no unified snapshot format or retention policy.

### Proposed Design

1. Introduce app-state package envelope:
   - `schemaVersion`
   - `savedAt`
   - `plannerEvents`
   - `memoEntries`
   - optional future sections
2. Storage service:
   - `loadStateWithMigration()`
   - `saveStateSnapshot(reason)`
   - `listSnapshots()`
   - `restoreSnapshot(id)`
3. Add backup schedule setting:
   - `"weekly"` or `"monthly"` or `"off"`
   - last-run timestamp in local storage
4. Trigger backup on app init when schedule threshold elapsed.
5. Add snapshot retention:
   - default keep latest 8 snapshots
   - prune oldest snapshots on create

### Migration Strategy

- parse old keys (`hualien-planner-events`, memo keys)
- map into envelope v1
- maintain forward-compatible unknown-sections behavior

### UI Changes

- settings section in farm-management:
   - schedule selector
   - snapshot list
   - restore action with confirmation

### Testing

- unit: migration from legacy keys
- unit: schedule due-calculation weekly/monthly boundaries
- unit: retention pruning
- unit: restore path integrity

### Risks

- storage quota overrun on large snapshots.
- Mitigation: bounded retention + snapshot size metadata for visibility.

---

## Issue #38 - Polygon Region Model: Trapezoid and Custom Shapes

### Objective

Replace rectangle-only region geometry with polygon-capable model while preserving compatibility.

### Current Gap

- planted regions store `position + size` rectangle only.
- overlap detection and draw tooling assume axis-aligned rectangles.

### Proposed Design

1. Introduce geometry union:
   - `shape: { kind: "rect", ... } | { kind: "polygon", points: Point[] }`
2. Backward compatibility:
   - on read, convert legacy rectangle to polygon (4 points) or to `rect` variant
3. Geometry utilities:
   - polygon area
   - point-in-polygon
   - polygon intersection for overlap detection
   - vertex drag constraints
4. Canvas updates (react-konva):
   - polygon draw mode
   - trapezoid quick tool
   - vertex handles with snap threshold

### Data/Event Model

- allow `crop_planted` and `crop_updated` payloads to carry `shape`.
- normalize when replaying old events.

### Testing

- unit: legacy rectangle normalization
- unit: area and overlap utilities
- unit: replay behavior with mixed old/new events

### Risks

- computational cost for overlap checks with many polygons.
- Mitigation: bounding-box prefilter before polygon intersection.

---

## Issue #36 - Region Editing: Merge, Split, and In-place Crop Reassignment

### Objective

Enable non-destructive region editing workflows.

### Current Gap

- users must remove and re-create regions to change crop assignment.
- no merge/split primitives for planner regions.

### Proposed Design

1. Add planner commands:
   - `region_merged`
   - `region_split`
   - `region_reassigned`
2. Merge flow:
   - user selects >=2 regions in same field
   - system validates topology and category compatibility
   - creates new merged region and marks old regions superseded
3. Split flow:
   - split by cut-line or auto-halves from selected axis
   - produces child regions linked to parent id
4. Reassign flow:
   - direct crop/category update in same region id
   - keeps timeline continuity

### Replay Semantics

- superseded regions hidden in present state but retained historically.
- timeline at past timestamp shows original geometry and assignment.

### Testing

- unit: merge validation and supersede behavior
- unit: split deterministic output
- unit: replay historical correctness before/after edit operations

### Risks

- ambiguous merge for disjoint polygons.
- Mitigation: first release limits merge to touching regions only.

---

## Issue #37 - Map/Blueprint Assisted Bootstrap with Color-based Region Detection

### Objective

Accelerate first-time planner setup from image sources.

### Current Gap

- manual region creation is slow and misaligned with actual layout.

### Proposed Design

1. Import wizard:
   - upload image
   - set scale via two-point distance calibration
   - choose segmentation sensitivity
2. Segmentation pipeline (client-side):
   - downsample image
   - color clustering (k-means or median-cut approximation)
   - contour extraction and polygon simplification
3. Candidate regions:
   - preview layer
   - user accept/reject each region
   - assign crop/facility category before finalize
4. Finalization:
   - emit standard planner region objects/events
   - persist source image reference metadata optionally

### Testing

- unit: segmentation threshold grouping behavior on fixture images
- unit: polygon simplification tolerance
- manual: blueprint and map screenshot import flow

### Risks

- noisy boundaries from shadows/labels in map images.
- Mitigation: blur + color tolerance controls + manual correction step.

---

## Issue #39 - Infrastructure Overlay: Water and Electricity in Planner Map

### Objective

Model utility infrastructure in the same planner space as crops/facilities.

### Current Gap

- no water/electric drawing layer
- no relation between fixed facilities and utility paths

### Proposed Design

1. Add overlay entities:
   - `UtilityNode` (pump, valve, outlet, tank, custom)
   - `UtilityEdge` (water/electric, sourceNodeId, targetNodeId, polyline)
2. Layer system:
   - base regions layer
   - utility layer with toggles
3. Linking:
   - optional references from region/facility to utility nodes
4. Timeline:
   - utility create/update/remove as planner events
   - replay at arbitrary time

### Testing

- unit: node/edge normalization
- unit: replay includes utility overlay changes
- manual: layer toggle and edit interactions

### Risks

- visual clutter on small screens.
- Mitigation: layer opacity and hide/show toggles.

---

## Issue #40 - Infinite Horizontal Timeline for Arbitrary Date Field State

### Objective

Provide smooth long-range temporal navigation across planner history.

### Current Gap

- current slider has bounded window and limited fast navigation.

### Proposed Design

1. Timeline UI rework:
   - horizontal virtualized ruler
   - drag/scroll with inertial behavior
   - quick jump actions (today, date picker, +/- 1 month)
2. Data loading strategy:
   - load event windows by month chunks around viewport
   - cache neighbor windows
3. State reconstruction:
   - compute nearest checkpoint + incremental replay for performance
4. Accessibility:
   - keyboard arrow stepping and jump shortcuts

### Performance Targets

- timeline move to visible state update under 100ms for typical event counts.
- avoid blocking main thread during large replay by chunking or memoized checkpoints.

### Testing

- unit: chunk window query boundaries
- unit: replay from checkpoints equals full replay result
- manual: rapid scroll across multi-year ranges

### Risks

- complexity in keeping scroll position stable when loading new windows.
- Mitigation: anchor-by-date strategy and deterministic pixel/date mapping.

---

## Sequencing Recommendation

1. #34 category expansion (unblocks facility semantics).
2. #35 persistence/backup reliability baseline.
3. #38 polygon geometry foundation.
4. #36 merge/split/reassign on top of polygon support.
5. #40 infinite timeline upgrade.
6. #39 utility overlay.
7. #37 image-assisted bootstrap.

## Validation Baseline Per Issue

- `bun run lint`
- `bunx tsc --noEmit`
- `bun test`
