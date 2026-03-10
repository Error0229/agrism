# Issue #101: Integrate Taiwan MOA and EPPO Pest/Disease Reference Images

## Implementation Specification

**Date**: 2026-03-10
**Status**: Research Complete
**Related Issues**: #97 (Pest Triage), #99 (Wikimedia Images), #100 (iNaturalist Gallery)

---

## 1. Data Source Analysis

### 1.1 Taiwan MOA — Important Agricultural Pest Diagnostic Atlas

**API Endpoint (confirmed working)**:
```
GET https://data.moa.gov.tw/api/v1/ImportantAgriculturalPestDiagnosticsType/
```

**Protocol**: REST/JSON (OpenAPI-documented at `https://data.moa.gov.tw/openapi.json`)

**Authentication**: None required (open data)

**Query Parameters**:
- `$top` — limit results (e.g., `$top=10`)
- `$skip` — pagination offset
- `$select` — select specific fields
- `$format` — response format
- `Order` — filter by taxonomic order (Latin name)
- `PestName_Ch` / `PestName_En` — filter by pest name
- `Page` — page number

**Dataset Size**: 103 records (confirmed), covering ~45 distinct pest species across ~70 crop types. Records are from 2011 regional surveillance data, primarily central Taiwan.

**Record Schema** (all fields confirmed from live API response):

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `ID` | string | Unique diagnostic code | `"diag13001001"` |
| `ReceiptDate` | string | Date received (YYYY-MM-DD) | `"2011-02-09"` |
| `Order_Latina` | string | Taxonomic order (Latin) | `"Coleoptera"` |
| `Order_Ch` | string | Taxonomic order (Chinese) | `"鞘翅目"` |
| `Family_Latina` | string | Taxonomic family (Latin) | `"Chrysomelidae"` |
| `Family_Ch` | string | Taxonomic family (Chinese) | `"金花蟲科"` |
| `PestName_Ch` | string | Pest common name (Chinese) | `"金花蟲"` |
| `PestName_En` | string | Pest common name (English) | `"leaf beetles"` |
| `PestName_Scientific` | string | Scientific name | `"Chrysomelidae"` |
| `EatWay` | string | Feeding method (1=chewing, 2=piercing-sucking) | `"1"` |
| `City_Ch` / `City_En` | string | City | `"台中市"` |
| `Town_Ch` / `Town_En` | string | Township | `"豐原區"` |
| `Identifier_Ch` / `Identifier_En` | string | Diagnostician names | `"陳淑佩、翁振宇"` |
| `Harm_Root` | string | Root damage ("Y" or "") | `""` |
| `Harm_Stem` | string | Stem damage | `""` |
| `Harm_leaf` | string | Leaf damage | `"Y"` |
| `Harm_Flower` | string | Flower damage | `""` |
| `Harm_Fruit` | string | Fruit damage | `""` |
| `Harm_Plant` | string | Whole plant damage | `""` |
| `Other` | string | Other damage | `""` |
| `Crop_Code` | string | Crop identifier | `"crop02001"` |
| `Crop_Name` | string | Crop name (Chinese) | `"十字花科"` |
| `Crop_ScientificName` | string | Crop scientific name | `"Brassicaceae"` |
| `Crop_Alias` | string | Alternative crop names | `""` |
| `Crop_Family_Latina` | string | Crop family (Latin) | `"Brassicaceae"` |
| `Crop_Family_Ch` | string | Crop family (Chinese) | `"十字花科"` |
| `Image` | string | Detail page URL | `"https://data.moa.gov.tw/Service/OpenData/AgriculturalPestsDetail.aspx?Tracecode=diag13001001"` |

**CRITICAL FINDING — Image Access**:

The `Image` field is NOT a direct image URL. It links to a detail page at:
```
https://data.moa.gov.tw/Service/OpenData/AgriculturalPestsDetail.aspx?Tracecode={ID}
```

The detail page contains actual images hosted on TARI (Taiwan Agricultural Research Institute) servers:
```
https://digiins.tari.gov.tw/diagnosis/images2/{ID_variant}.jpg
```

**Image URL Pattern** (confirmed from detail page scraping):
- Plant damage photos: `diag{NNNNNNNN}01.jpg`, `diag{NNNNNNNN}02.jpg` (suffix 01-09)
- Pest body photos: `diag{NNNNNNNN}11.jpg`, `diag{NNNNNNNN}12.jpg` (suffix 11-19)
- Typically 2-5 images per record (2 plant + 3 pest for the sample checked)

**CAVEAT**: The TARI image host (`digiins.tari.gov.tw`) returned `ECONNREFUSED` during testing. This server may be intermittently available or behind a firewall. The import process MUST handle connectivity failures gracefully with retries and fallback behavior.

**License**: Taiwan Government Open Data — free for value-added applications. Attribution to "行政院農業部" (Ministry of Agriculture, Executive Yuan) is recommended.

**Secondary Dataset Available** — `PestDiseaseDiagnosisServiceType`:
```
GET https://data.moa.gov.tw/api/v1/PestDiseaseDiagnosisServiceType/
```
This is a Q&A dataset with ~500+ records containing symptom descriptions and treatment advice, but NO image URLs. Useful as supplementary text data for the triage system but not for this image integration issue.

---

### 1.2 EPPO Global Database API

**API Base URL (confirmed)**:
```
https://api.eppo.int/gd/v2/
```

**OpenAPI Spec**: `https://api.eppo.int/gd/v2/eppo_api_gd_v2.yml`

**Authentication**: API key passed via `X-Api-Key` header. Free registration at `https://data.eppo.int` dashboard.

**Rate Limits** (effective 2025-10-01): Max 60 requests per IP within a 10-second sliding window. HTTP 429 returned with `retry_after` field when exceeded.

**Key Endpoints for This Feature**:

#### 1.2.1 Taxonomy Lookup — Name to EPPO Code
```
GET /tools/name2codes?name={pestName}&onlyPreferred=true
```
Response: `[{ "eppocode": "PHYTNI", "preferred": true }]`

This is the entry point: given a pest name from the triage result, resolve to an EPPO code.

#### 1.2.2 Photos
```
GET /taxons/taxon/{EPPOCODE}/photos
```
Response (per OpenAPI spec):
```json
[
  {
    "photo_id": 12345,
    "descinfo": "Symptoms on tomato leaves",
    "authors": "J. Smith",
    "tags": "{Adult}",
    "files": [
      { "size": "small", "url": "https://..." },
      { "size": "medium", "url": "https://..." },
      { "size": "large", "url": "https://..." }
    ]
  }
]
```

#### 1.2.3 Host-Pest Relationships
```
GET /taxons/taxon/{EPPOCODE}/hosts
GET /taxons/taxon/{EPPOCODE}/pests
```
Response: `[{ "eppocode": "SOLME", "prefname": "Solanum melongena", "class_label": "Major" }]`

Useful for cross-referencing: "this pest also affects these crops."

#### 1.2.4 Taxon Overview & Names
```
GET /taxons/taxon/{EPPOCODE}/overview
GET /taxons/taxon/{EPPOCODE}/names
```

Provides preferred names, synonyms, and multilingual names — helpful for matching pest names between Chinese/English/Scientific.

#### 1.2.5 Distribution
```
GET /taxons/taxon/{EPPOCODE}/distribution
```
Confirms if a pest is present in Taiwan (country_iso: "TW").

**API Requires Key**: All endpoints return HTTP 401 without the `X-Api-Key` header (confirmed by testing).

**License**: EPPO Open Data Licence. The licence PDF URL at `/static/files/EPPO_Open_Data_Licence.pdf` returned 404 during testing. Based on EPPO documentation:
- Free API key available after registration
- "All services require acceptance of our Open Data Licence terms"
- Likely requires attribution to "EPPO Global Database"
- Caching permitted (they explicitly provide download options in XML/SQL/JSON)
- Terms should be reviewed at registration time; a `EPPO_LICENSE_ACCEPTED` env var flag is recommended

---

## 2. Proposed Schema Changes

### 2.1 New Table: `pestReferenceImages`

A dedicated table for pest/disease reference images from external data sources. This is separate from the `pestObservations` table to avoid bloating observation records and to enable reuse across multiple observations.

```typescript
// In convex/schema.ts
pestReferenceImages: defineTable({
  // === Identity ===
  farmId: v.optional(v.id("farms")),  // null = global/shared reference
  source: v.string(),                  // "moa" | "eppo"
  sourceId: v.string(),               // MOA: diag ID, EPPO: EPPOCODE

  // === Pest/Disease Info ===
  pestNameCh: v.string(),              // Chinese common name
  pestNameEn: v.optional(v.string()),  // English common name
  pestNameScientific: v.optional(v.string()), // Scientific name
  eppoCode: v.optional(v.string()),    // EPPO code (if resolved)

  // === Taxonomy ===
  orderLatin: v.optional(v.string()),  // e.g., "Coleoptera"
  orderCh: v.optional(v.string()),     // e.g., "鞘翅目"
  familyLatin: v.optional(v.string()), // e.g., "Chrysomelidae"
  familyCh: v.optional(v.string()),    // e.g., "金花蟲科"
  feedingMethod: v.optional(v.string()), // "chewing" | "piercing_sucking"

  // === Damage Profile ===
  harmParts: v.optional(v.array(v.string())), // ["root","stem","leaf","flower","fruit","plant"]

  // === Associated Crops ===
  cropName: v.optional(v.string()),
  cropScientificName: v.optional(v.string()),
  cropFamily: v.optional(v.string()),

  // === Images (stored in R2) ===
  images: v.array(v.object({
    url: v.string(),                    // R2 public URL (medium)
    thumbnailUrl: v.string(),           // R2 public URL (thumbnail)
    category: v.string(),              // "plant_damage" | "pest_body" | "symptom" | "general"
    description: v.optional(v.string()),
    sourceUrl: v.string(),             // Original image URL or detail page
    author: v.optional(v.string()),
    license: v.string(),               // "TW-Gov-OD" | "EPPO-ODL" | etc.
  })),

  // === Meta ===
  importedAt: v.number(),
  lastUpdated: v.optional(v.number()),
})
  .index("by_source", ["source"])
  .index("by_pestNameScientific", ["pestNameScientific"])
  .index("by_eppoCode", ["eppoCode"])
  .index("by_pestNameCh", ["pestNameCh"])
  .index("by_cropScientificName", ["cropScientificName"]),
```

### 2.2 Schema Addition to `pestObservations`

Add a field to link triage results to reference images:

```typescript
// Add to pestObservations table
referenceImageIds: v.optional(v.array(v.id("pestReferenceImages"))),
```

### 2.3 Update `triageResults` Shape

Extend the triage results to include EPPO code for cross-referencing:

```typescript
// Add to triageResults object shape
eppoCode: v.optional(v.string()),
referenceImageId: v.optional(v.id("pestReferenceImages")),
```

---

## 3. Backend Actions

### 3.1 MOA Import Action: `pestImageImport.ts`

**Purpose**: One-time batch import of the MOA pest diagnostic dataset.

**Flow**:
```
1. Fetch all 103 records from MOA API
   GET /api/v1/ImportantAgriculturalPestDiagnosticsType/?$top=200

2. For each record:
   a. Parse pest/crop metadata from API fields
   b. Fetch detail page to extract image URLs
      GET /Service/OpenData/AgriculturalPestsDetail.aspx?Tracecode={ID}
   c. Parse HTML to extract image URLs from digiins.tari.gov.tw
   d. Download each image (with retry logic for TARI server instability)
   e. Upload to R2: pests/moa/{ID}/{index}.jpg (medium) + thumb
   f. Create pestReferenceImages record in Convex

3. Idempotent: skip records already imported (check by source+sourceId)
```

**R2 Key Pattern**:
```
pests/moa/{diagId}/{index}.jpg          # Medium (300px)
pests/moa/{diagId}/{index}_thumb.jpg    # Thumbnail (64px)
```

**Error Handling**:
- TARI server unavailable: Log warning, skip image download, store record with empty images array, mark for retry
- Rate limiting: 500ms delay between detail page fetches
- Invalid HTML / no images found: Store record metadata without images
- Batch scheduling: Use `ctx.scheduler.runAfter()` with 3-second stagger per record (same pattern as `cropGalleryLookup.ts`)

**Convex Functions**:
- `pestImageImport.importMoaDataset` — internalAction, orchestrates full import
- `pestImageImport.importSingleMoaRecord` — internalAction, processes one record
- `pestReferenceImages.upsert` — internalMutation, creates/updates reference image record

### 3.2 EPPO Lookup Action: `pestEppoLookup.ts`

**Purpose**: On-demand lookup of EPPO reference images when a pest triage result is returned.

**Flow**:
```
1. After AI triage returns results (in pestTriage.ts):
   For each triageResult.possibleCause:

   a. Check pestReferenceImages table for existing EPPO entry
      (query by pestNameCh or pestNameScientific)

   b. If not cached:
      i.   Resolve pest name to EPPO code:
           GET /tools/name2codes?name={scientificName}
      ii.  Fetch photos:
           GET /taxons/taxon/{EPPOCODE}/photos
      iii. Download top 3 images (prefer "medium" size)
      iv.  Upload to R2: pests/eppo/{EPPOCODE}/{photo_id}.jpg
      v.   Fetch host-pest relationships:
           GET /taxons/taxon/{EPPOCODE}/hosts
      vi.  Create pestReferenceImages record

   c. Link reference image ID to triage result
```

**R2 Key Pattern**:
```
pests/eppo/{EPPOCODE}/{photo_id}.jpg          # Medium
pests/eppo/{EPPOCODE}/{photo_id}_thumb.jpg    # Thumbnail
```

**Error Handling**:
- 401 (missing API key): Log error, skip EPPO lookup, triage still works without images
- 429 (rate limit): Respect `retry_after` header, use exponential backoff
- Name not found: Skip silently (not all pests have EPPO entries)
- No photos available: Store metadata-only record (images: [])
- Network failure: Log, skip — non-blocking for triage workflow

**Environment Variable**: `EPPO_API_KEY` — required for EPPO integration.

**Convex Functions**:
- `pestEppoLookup.lookupPestImages` — internalAction, resolves EPPO code + fetches images
- `pestEppoLookup.batchLookupForTriage` — internalAction, processes all triage results

### 3.3 Reference Image Query Functions: `pestReferenceImages.ts`

**Convex Functions**:
- `pestReferenceImages.listByPestName` — query by Chinese or scientific name
- `pestReferenceImages.listByCrop` — query by crop scientific name
- `pestReferenceImages.getByEppoCode` — query by EPPO code
- `pestReferenceImages.listAll` — paginated browse of all reference images
- `pestReferenceImages.search` — full-text search by pest/crop name

---

## 4. Frontend Components

### 4.1 Reference Image Gallery in Triage Results

**Location**: `src/app/(app)/records/pest/page.tsx` — existing triage results section

**Changes**: After each `triageResult` card, show matched reference images:

```
┌──────────────────────────────────────┐
│ 可能原因：木瓜秀粉介殼蟲            │
│ 可能性：高                           │
│ ┌─────────────────────────────────┐  │
│ │ 參考圖片                        │  │
│ │ ┌──────┐ ┌──────┐ ┌──────┐     │  │
│ │ │ img1 │ │ img2 │ │ img3 │     │  │
│ │ └──────┘ └──────┘ └──────┘     │  │
│ │ 來源：農業部害蟲診斷圖鑑        │  │
│ └─────────────────────────────────┘  │
│ 推理：...                            │
│ 建議檢查：...                        │
│ 防治方法：...                        │
└──────────────────────────────────────┘
```

**Component**: `<PestReferenceImageGallery pestName={result.possibleCause} />`

### 4.2 Pest/Disease Reference Library Page

**New Route**: `src/app/(app)/records/pest/library/page.tsx`

**Purpose**: Browsable library of all imported pest/disease reference images.

**Layout**:
```
┌──────────────────────────────────────────────┐
│ 病蟲害圖鑑                    [搜尋] [篩選]  │
├──────────────────────────────────────────────┤
│ 篩選: [全部▼] [害蟲部位▼] [作物▼] [來源▼]   │
├──────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │  thumb  │ │  thumb  │ │  thumb  │         │
│ │ 金花蟲  │ │ 介殼蟲  │ │ 粉蝨   │         │
│ │ 鞘翅目  │ │ 半翅目  │ │ 半翅目  │         │
│ └─────────┘ └─────────┘ └─────────┘         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │  thumb  │ │  thumb  │ │  thumb  │         │
│ │ 薊馬    │ │ 葉蟎   │ │ 蚜蟲   │         │
│ └─────────┘ └─────────┘ └─────────┘         │
└──────────────────────────────────────────────┘
```

**Features**:
- Grid of pest thumbnails with Chinese name and taxonomy
- Click to expand: full image gallery, damage details, associated crops
- Filter by: source (MOA/EPPO), affected plant part, crop type, taxonomic order
- Search by pest name (Chinese, English, scientific)
- Link to pest detail page with all reference images

### 4.3 Pest Reference Detail Dialog/Page

**Component**: `<PestReferenceDetail referenceId={id} />`

**Content**:
- All images in a lightbox gallery (plant damage + pest body separated)
- Pest metadata: names (Chinese/English/scientific), taxonomy, feeding method
- Damage profile: which plant parts are affected
- Associated crops
- Source attribution
- Link to external source (MOA detail page or EPPO Global Database)

### 4.4 Integration with Crop Detail Page

**Location**: `src/app/(app)/crops/[cropId]/page.tsx`

Add a "常見病蟲害圖片" (Common Pest/Disease Images) section that queries `pestReferenceImages` by `cropScientificName` matching the crop's scientific name.

### 4.5 New Hook

**File**: `src/hooks/use-pest-reference-images.ts`

```typescript
export function usePestReferenceImages(pestName?: string)
export function usePestReferenceImagesByCrop(cropScientificName?: string)
export function usePestReferenceLibrary(filters?: PestLibraryFilters)
export function usePestReferenceDetail(referenceId?: Id<"pestReferenceImages">)
```

---

## 5. Data Flow

### 5.1 MOA Import (One-Time Batch)

```
Admin triggers import
  │
  ▼
pestImageImport.importMoaDataset (internalAction)
  │
  ├─► Fetch all 103 records from MOA API
  │
  ├─► For each record, schedule:
  │     pestImageImport.importSingleMoaRecord (staggered by 3s)
  │       │
  │       ├─► Fetch detail page HTML
  │       ├─► Parse image URLs from digiins.tari.gov.tw
  │       ├─► Download images (retry x3)
  │       ├─► Upload to R2 (pests/moa/{id}/...)
  │       └─► Upsert pestReferenceImages record
  │
  └─► Log summary (imported/skipped/failed)
```

### 5.2 EPPO Lookup (On-Demand, Post-Triage)

```
User creates pest observation
  │
  ▼
pestTriage.triageObservation (action)
  │
  ├─► AI generates triage results (existing flow)
  │
  ├─► Save triage results (existing flow)
  │
  └─► Schedule: pestEppoLookup.batchLookupForTriage
        │
        ├─► For each possibleCause:
        │     │
        │     ├─► Check cache (pestReferenceImages by name)
        │     │     └── If found: link referenceImageId
        │     │
        │     └─► If not cached:
        │           ├─► name2codes → EPPOCODE
        │           ├─► /photos → image URLs
        │           ├─► Download + R2 upload
        │           ├─► /hosts → associated crops
        │           ├─► Create pestReferenceImages record
        │           └─► Link referenceImageId to triage result
        │
        └─► Update observation with referenceImageIds
```

### 5.3 Frontend Display

```
User views pest observation
  │
  ├─► useQuery(pestObservations.getById)
  │     └── Returns triageResults with referenceImageIds
  │
  ├─► For each triageResult with referenceImageId:
  │     useQuery(pestReferenceImages.getById)
  │       └── Returns images array with R2 URLs
  │
  └─► Render: <PestReferenceImageGallery />
        └── Thumbnails → click for lightbox → attribution footer
```

---

## 6. Edge Cases and Error Handling

### 6.1 TARI Image Server Unavailability
- The `digiins.tari.gov.tw` server returned `ECONNREFUSED` during testing
- Strategy: Retry 3 times with exponential backoff (1s, 3s, 9s)
- Fallback: Store MOA metadata without images; mark as `imageStatus: "pending"`
- Periodic retry: Admin action to re-attempt failed image downloads

### 6.2 EPPO API Key Not Configured
- If `EPPO_API_KEY` env var is missing, skip EPPO lookups entirely
- Triage still works; just no EPPO reference images
- Log warning once, not per observation

### 6.3 Pest Name Mismatch
- AI triage returns Chinese pest names; EPPO uses Latin/English
- Strategy: Try scientific name first (from crop's `commonPests` array), then English name, then Chinese name
- The MOA dataset can bridge: it has Chinese, English, and scientific names for the same pest
- Build a name-mapping lookup from imported MOA data

### 6.4 No Images Found for a Pest
- Some EPPO taxa have no photos
- Some MOA records may have broken image links
- Always show triage results even without images
- Display "暫無參考圖片" (No reference images available) placeholder

### 6.5 Rate Limiting
- MOA API: No documented rate limits, but use 500ms delay between requests
- EPPO API: 60 req / 10s window. Implement sliding window tracker
- R2 uploads: No practical limit, but serialize to avoid timeouts

### 6.6 Duplicate Prevention
- MOA: Check by `source: "moa"` + `sourceId: diagId`
- EPPO: Check by `source: "eppo"` + `sourceId: EPPOCODE`
- Idempotent upsert pattern (same as cropImageLookup.ts)

### 6.7 Image Sizing
- Follow existing pattern: 64px thumbnail, 300px medium
- EPPO provides multiple sizes (small/medium/large) — use medium
- MOA images: download original JPG, resize before R2 upload (use sharp or similar)
- Consider: MOA images may not need resizing if they are already web-sized

---

## 7. Attribution Requirements

### 7.1 Taiwan MOA
- **Source label (zh-TW)**: "資料來源：行政院農業部重要農業害蟲診斷圖鑑"
- **English**: "Source: Taiwan MOA Important Agricultural Pest Diagnostic Atlas"
- **License**: Taiwan Government Open Data License
- **Link**: `https://data.moa.gov.tw/Service/OpenData/AgriculturalPestsDetail.aspx?Tracecode={ID}`
- Store `license: "TW-Gov-OD"` in image records

### 7.2 EPPO Global Database
- **Source label (zh-TW)**: "資料來源：EPPO 全球資料庫"
- **English**: "Source: EPPO Global Database (https://gd.eppo.int)"
- **License**: EPPO Open Data Licence (accepted at API key registration)
- **Link**: `https://gd.eppo.int/taxon/{EPPOCODE}/photos`
- Store `license: "EPPO-ODL"` and `author` from API response
- Per-image attribution from the `authors` field in the photos endpoint

### 7.3 UI Attribution Display
- Each reference image card must show source badge: "農業部" or "EPPO"
- Attribution text in image lightbox footer
- Link to original source on click/tap of attribution

---

## 8. Environment Variables

**New Required**:
- `EPPO_API_KEY` — Free API key from https://data.eppo.int (optional; feature degrades gracefully without it)

**Existing (already configured)**:
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` (`agrism-crop-media`)
- `R2_PUBLIC_URL` (`https://media.agrism.catjam.dev`)
- `OPENROUTER_API_KEY` (for triage AI)

---

## 9. Implementation Order

### Phase 1: Schema + MOA Import (Backend Only)
1. Add `pestReferenceImages` table to `convex/schema.ts`
2. Create `convex/pestReferenceImages.ts` (queries + mutations)
3. Create `convex/pestImageImport.ts` (MOA batch import action)
4. Run initial import of 103 MOA records

### Phase 2: EPPO Integration (Backend)
5. Create `convex/pestEppoLookup.ts` (on-demand EPPO lookup action)
6. Update `convex/pestTriage.ts` to schedule EPPO lookup after triage
7. Update `pestObservations` schema with `referenceImageIds` field
8. Update triage results shape with `eppoCode` and `referenceImageId`

### Phase 3: Frontend — Triage Integration
9. Create `src/hooks/use-pest-reference-images.ts`
10. Create `src/components/pest/PestReferenceImageGallery.tsx`
11. Update `src/app/(app)/records/pest/page.tsx` to show reference images in triage results

### Phase 4: Frontend — Reference Library
12. Create `src/app/(app)/records/pest/library/page.tsx`
13. Create `src/components/pest/PestReferenceDetail.tsx`
14. Add navigation link from pest observation page to library

### Phase 5: Crop Integration
15. Add "常見病蟲害" section to crop detail page
16. Query `pestReferenceImages` by `cropScientificName`

---

## 10. Open Questions / Risks

1. **TARI server reliability**: The image host `digiins.tari.gov.tw` refused connections during testing. This may be temporary, or the server may be decommissioned. The import must handle this gracefully and provide a re-try mechanism.

2. **EPPO license review**: The EPPO Open Data Licence PDF was not accessible (404). The exact terms for caching images in R2 should be confirmed during API key registration. The approach of caching images follows the same pattern used for Wikimedia/iNaturalist, but EPPO terms may differ.

3. **Dataset freshness**: The MOA dataset contains 103 records from 2011. This is a curated reference atlas, not live surveillance data. It likely does not update frequently, but a periodic re-check mechanism could be added.

4. **Image resizing for MOA**: Unlike EPPO (which provides multiple sizes) and Wikimedia (which supports `?width=` parameter), MOA/TARI images are raw JPGs. We may need server-side image processing (sharp) in the Convex action, or accept the original sizes and rely on CSS/browser resizing.

5. **Name matching accuracy**: Bridging Chinese pest names (from AI triage) to EPPO codes (Latin/English taxonomy) is non-trivial. The MOA dataset can serve as a lookup table, but coverage is limited to 45 pest species. Consider building a manual mapping table for common Hualien pests.

6. **EPPO Taiwan coverage**: EPPO focuses on European/Mediterranean plant protection. While it covers many globally distributed pests (e.g., Spodoptera, Phytophthora), some Taiwan-specific subtropical pests may not have EPPO entries. The MOA dataset provides better local coverage.
