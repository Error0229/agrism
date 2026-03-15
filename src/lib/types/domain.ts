// Domain types inferred from Convex schema.
// Use Doc<"tableName"> directly in most cases.
// These aliases are provided for convenience.

import type { Doc, Id } from "../../../convex/_generated/dataModel";

// --- Crop domain ---
export type Crop = Doc<"crops">;
export type CropTemplate = Doc<"cropTemplates">;
export type CropTemplateItem = Doc<"cropTemplateItems">;

// --- Field domain ---
export type Field = Doc<"fields">;
export type PlantedCrop = Doc<"plantedCrops">;
export type Facility = Doc<"facilities">;
export type UtilityNode = Doc<"utilityNodes">;
export type UtilityEdge = Doc<"utilityEdges">;

// --- Task domain ---
export type Task = Doc<"tasks">;

// --- Records domain ---
export type HarvestLog = Doc<"harvestLogs">;
export type FinanceRecord = Doc<"financeRecords">;
export type SoilAmendment = Doc<"soilAmendments">;
export type SoilNote = Doc<"soilNotes">;
export type WeatherLog = Doc<"weatherLogs">;

// --- Journal domain (issue #107) ---
export type FieldJournalEntry = Doc<"fieldJournalEntries">;
export type RegionJournalEntry = Doc<"regionJournalEntries">;

// --- ID types ---
export type FarmId = Id<"farms">;
export type CropId = Id<"crops">;
export type FieldId = Id<"fields">;
export type PlantedCropId = Id<"plantedCrops">;
export type TaskId = Id<"tasks">;
