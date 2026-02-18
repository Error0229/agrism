# Map Import Two-Point Scale Calibration Design

Date: 2026-02-18
Related issue: #48
Status: Implementation-ready

## Objective

Improve map/blueprint bootstrap accuracy by calibrating pixel distance to real-world distance before mapping detected color zones into field coordinates.

## Design

- Extend zone detection utility with optional calibration input:
  - two image points (`pointA`, `pointB`)
  - real-world distance in meters
- Compute `pxPerCm` from calibration and convert zone bounds from pixels to centimeters.
- Anchor calibrated coordinates to detected zone minimum bounds so imported regions start from planner origin.
- Keep fallback ratio-based conversion when calibration is absent or invalid.

## UI Flow

- User uploads image and sees preview.
- User clicks two points on preview.
- User enters known distance in meters.
- User runs “apply calibration + re-detect”.
- User can clear calibration and return to default detection.

## Validation

- Unit tests for:
  - default mapping path
  - calibrated mapping path producing scaled sizes
- End-to-end manual check in field planner import dialog.
