# Location-Aware Agronomy Design

Date: 2026-03-06
Status: Drafted for implementation
Related issues: #83, #91, #92, #17

## Goal

Make the product generic beyond Hualien without losing Hualien as the strongest first supported location.

The system should be able to answer:

- what advice is globally true for this crop
- what changes in this township/district
- what changes on this farm
- what changes in this field

## 1. Current gap

The current product mixes location-specific knowledge into crop-level fields, mainly through a single `hualienNotes` concept.

That creates three problems:

- the app cannot grow beyond Hualien cleanly
- location-specific advice is hard to reuse or compare
- the user cannot easily see which advice is global vs local

## 2. Scope hierarchy

The agronomy system should resolve advice across these layers:

1. base crop profile
2. country-level profile
3. county/city-level profile
4. district/township-level profile
5. farm override
6. field override

Not every crop will have data at every layer.

The resolver should therefore support fallback instead of requiring full coverage.

## 3. Farm location model

## 3.1 Recommended stored fields

- country
- admin level 1:
  - county/city/state/province
- admin level 2:
  - district/township
- optional village/locality text
- lat/lng optional
- elevation band optional
- coastal/inland flag optional
- free-form farm notes

## 3.2 Why township/district matters

Township-level location is a good product compromise:

- specific enough to localize advice meaningfully
- simple enough for users to select without map friction
- compatible with localized weather or crop-profile expansion later

## 4. Localized agronomy profile model

## 4.1 Recommended shape

A localized profile should include:

- crop reference
- geography key
- geography granularity
- profile status
- localized facts
- localized notes
- source metadata
- updatedAt

Localized facts should be partial overrides, not full cloned crop records.

## 4.2 Example override behavior

Base profile may say:

- tomato transplant window = Sep-Nov

Township profile may narrow it to:

- in this humid coastal township, Oct-Nov is safer

Farm override may add:

- in this windy field, use protected area only

The UI should show the resolved active answer and allow inspection of where it came from.

## 5. Resolver behavior

When the app needs a fact:

1. start from base crop profile
2. apply broader geography overrides
3. apply narrower geography overrides
4. apply farm override
5. apply field override

The system should record which scope supplied the final value.

That provenance matters for trust and debugging.

## 6. Integration with planning

The planner should not read only static crop constants.

Instead it should resolve:

- planting windows
- risk notes
- suitability flags
- spacing or structure cautions
- disease pressure clues

from both crop data and location-aware overlays.

Then field context from issue #17 should further refine that result using:

- sun exposure
- drainage
- wind exposure
- slope
- soil texture/pH/organic matter

## 7. Integration with crop import

The import flow should accept farm location as input context.

However, import must still distinguish:

- generic crop facts
- location-dependent facts

Do not store everything the importer finds as if it were globally true.

## 8. Migration strategy

## 8.1 Existing Hualien data

Migrate seeded `hualienNotes` into location-aware profiles keyed to Hualien-level geography.

Do not discard the text.
Move it into the new structure with provenance that it came from legacy seeded data.

## 8.2 Existing farms

Existing farms without a location should:

- continue functioning
- fall back to base crop profiles
- be prompted later to set a location for better accuracy

## 9. UI requirements

## 9.1 Make scope visible

Whenever the app shows localized advice, show what scope it is based on.

Examples:

- `一般建議`
- `花蓮縣建議`
- `吉安鄉建議`
- `本農地調整`

## 9.2 Avoid hiding conflicts

If base and local guidance differ, the user should be able to inspect the difference instead of only seeing the final resolved value.

## 10. Sequencing

1. farm location model
2. localized profile schema
3. migration of `hualienNotes`
4. resolver utilities
5. crop detail rendering with provenance
6. planner suitability integration

## 11. Validation

### Unit tests

- fallback order
- precedence rules
- migration from `hualienNotes`
- resolution of farm override over localized profile

### Manual checks

- compare one crop on two different township profiles
- clear farm location and verify base fallback works
- inspect crop detail to confirm visible provenance and scope

## 12. Guardrails

- Do not hardcode Hualien-specific wording into generic crop fields going forward.
- Do not make location required before the farm can be used.
- Do not flatten resolved values back into the base crop record.
- Do not assume location alone is enough; field context still matters.
