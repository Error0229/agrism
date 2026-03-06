# Crop Knowledge and Import Design

Date: 2026-03-06
Status: Drafted for implementation
Related issues: #86, #89, #90

## Goal

Turn crop data from a flat reference card into an evidence-backed knowledge system that is:

- searchable
- editable
- localized
- reviewable
- safe against low-quality hallucinated imports

The product must support senior-farmer-level questions, not just hobby-card metadata.

## 1. Current gap

The current crop model captures a useful but shallow subset:

- months
- spacing
- water/sun
- pH
- pest notes
- one localized notes field

This is insufficient for:

- trustworthy import
- provenance and citation tracking
- location-aware agronomy
- farm-specific overrides
- richer planning logic

## 2. Product principles

### 2.1 Import must preserve evidence

The system should not only save final values. It should preserve:

- source URLs
- confidence
- last verification time
- whether the value was user-edited

### 2.2 Missing is better than fake

If the import cannot justify a field, the field should remain empty or low-confidence instead of being confidently fabricated.

### 2.3 Users own the final truth

Imported data is a starting point. The user must be able to override any value without losing the original imported evidence.

### 2.4 Avoid over-normalizing the first version

The schema should be rich enough for provenance and localization, but not so deeply normalized that every read becomes cumbersome in Convex.

## 3. Recommended knowledge structure

## 3.1 Split identity from agronomy facts

Keep a core crop identity document with fields such as:

- canonical name
- aliases
- cultivar/variety
- category
- growth habit
- whether the record is default/imported/custom

Do not rely on one large document alone for all agronomy detail.

## 3.2 Add scoped crop profiles

Recommended profile scopes:

- `base`
- `location`
- `farm`

Each profile should hold:

- scope metadata
- profile status
- facts
- source set
- notes

This provides a practical layered model without forcing every fact into its own database row.

## 3.3 Fact structure

Each fact entry should be shaped like:

- `key`
- `value`
- `unit`
- `confidence`
- `required`
- `sourceRefs`
- `origin: imported | user | seeded | derived`
- `updatedAt`

Suggested implementation:
facts live as arrays or grouped objects within a profile doc to keep Convex reads simple.

## 4. Required knowledge categories

The first import/review flow should explicitly support these categories.

## 4.1 Identity and planting material

- crop common name
- scientific name when available
- cultivar/variety
- aliases
- propagation method:
  - seed
  - seedling
  - cutting
  - tuber/rhizome
  - grafted tree

## 4.2 Timing and lifecycle

- sowing window
- transplanting window
- approximate days to germination
- approximate days to first harvest
- harvest period length
- whether it is annual/biennial/perennial
- rough stage sequence

## 4.3 Site suitability

- ideal temperature band
- risky temperature band
- sunlight preference
- rainfall/humidity notes
- wind sensitivity
- elevation sensitivity
- drainage and waterlogging tolerance

## 4.4 Soil and fertility

- preferred soil texture
- pH range
- fertility demand
- organic matter preference
- salinity sensitivity
- common deficiency risks

## 4.5 Water and structure

- watering intensity
- critical drought-sensitive stages
- trellis/support requirement
- pruning or thinning need
- canopy/root spread or habit notes
- row spacing
- plant spacing

## 4.6 Pest and disease

- common pests
- common diseases
- symptom cues
- common triggering conditions
- prevention actions
- treatment/response actions

## 4.7 Harvest and planning constraints

- harvest maturity signs
- harvest cadence
- storage notes
- companion/neighbor constraints
- rotation family
- orchard/perennial spacing constraints

## 5. Import pipeline

## 5.1 Step 1: crop identity normalization

Before broad research, the system should normalize:

- intended crop name
- variety if provided
- common aliases
- whether the result is a vegetable, fruit tree, herb, etc.

If identity is ambiguous, stop early and ask the user to confirm instead of importing the wrong crop.

## 5.2 Step 2: evidence-backed research

Use OpenRouter with web search enabled to collect structured facts for the required categories.

Important rule:
Do not request “a crop description.” Request field groups explicitly.

Example research passes:

1. identity + lifecycle
2. site/soil/water/spacing
3. pest/disease/risk
4. localized adaptation clues

This lowers the chance that one bad generation contaminates the whole record.

## 5.3 Step 3: post-processing

After the model response:

- normalize units
- clamp obviously impossible values
- deduplicate sources
- mark unsupported fields as missing
- compute confidence per fact

Confidence should consider:

- number of corroborating sources
- specificity of sources
- consistency across sources
- whether the fact is base or localized

## 5.4 Step 4: review gate

The user should review imported data before save.

The review screen should clearly separate:

- required fields
- recommended fields
- optional fields

It should also show:

- confidence
- source count
- whether the value is generic or localized

## 6. Review workflow requirements

### 6.1 Required field gate

Do not silently save a crop that lacks too many critical fields.

Critical examples:

- identity
- lifecycle type
- spacing
- rough planting timing
- basic water/sun requirement

The user may still save an incomplete crop, but the system should make that a conscious action.

### 6.2 Editable before save

Every imported field must be editable before save.

### 6.3 Override provenance

When the user changes a value:

- keep the imported value in history
- record the final active value as user-overridden

## 7. UI recommendation

## 7.1 Replace “新增自訂作物” with two paths

- `手動新增`
- `智慧匯入`

Manual creation stays lightweight.
Smart import becomes the richer path for serious crop setup.

## 7.2 Crop detail should show provenance

On the crop detail page, show:

- fact confidence
- profile scope
- last verified time
- whether the active value is imported or user-edited

This builds trust.

## 8. Implementation recommendation

### Phase 1

- create richer crop/profile schema
- migrate current flat fields
- build manual editing over new schema

### Phase 2

- implement web-search-backed import
- add review gate
- persist source metadata

### Phase 3

- add re-import/update path
- diff old and new facts
- support selective refresh of stale facts

## 9. Validation

### Unit tests

- fact normalization
- confidence scoring heuristics
- required-field gating
- source deduplication
- migration from existing flat crop records

### Manual checks

- import a common crop with good coverage
- import a niche crop with partial coverage
- override imported values
- confirm detail page displays provenance clearly

## 10. Guardrails

- Do not save citations only at whole-record level; preserve them at fact level.
- Do not allow the importer to overwrite user overrides without explicit review.
- Do not pretend township-specific agronomy is globally valid.
- Do not collapse import review into a single one-click “trust the AI” action.
