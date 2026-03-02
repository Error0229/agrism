// v2 domain types inferred from Drizzle schema.
// These are the canonical types for server/client data exchange.

import type {
  cropPlacements,
  cropTemplateItems,
  cropTemplates,
  crops,
  facilities,
  fieldContexts,
  fields,
  financeRecords,
  harvestLogs,
  plantedCrops,
  soilAmendments,
  soilNotes,
  soilProfiles,
  tasks,
  utilityEdges,
  utilityNodes,
  weatherLogs,
} from '@/server/db/schema'

// --- Crop domain ---
export type Crop = typeof crops.$inferSelect
export type NewCrop = typeof crops.$inferInsert
export type CropTemplate = typeof cropTemplates.$inferSelect
export type NewCropTemplate = typeof cropTemplates.$inferInsert
export type CropTemplateItem = typeof cropTemplateItems.$inferSelect
export type NewCropTemplateItem = typeof cropTemplateItems.$inferInsert

// --- Field domain ---
export type Field = typeof fields.$inferSelect
export type NewField = typeof fields.$inferInsert
export type FieldContext = typeof fieldContexts.$inferSelect
export type NewFieldContext = typeof fieldContexts.$inferInsert
export type PlantedCrop = typeof plantedCrops.$inferSelect
export type NewPlantedCrop = typeof plantedCrops.$inferInsert
export type CropPlacement = typeof cropPlacements.$inferSelect
export type NewCropPlacement = typeof cropPlacements.$inferInsert
export type Facility = typeof facilities.$inferSelect
export type NewFacility = typeof facilities.$inferInsert
export type UtilityNode = typeof utilityNodes.$inferSelect
export type NewUtilityNode = typeof utilityNodes.$inferInsert
export type UtilityEdge = typeof utilityEdges.$inferSelect
export type NewUtilityEdge = typeof utilityEdges.$inferInsert

// --- Task domain ---
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

// --- Records domain ---
export type HarvestLog = typeof harvestLogs.$inferSelect
export type NewHarvestLog = typeof harvestLogs.$inferInsert
export type FinanceRecord = typeof financeRecords.$inferSelect
export type NewFinanceRecord = typeof financeRecords.$inferInsert
export type SoilProfile = typeof soilProfiles.$inferSelect
export type NewSoilProfile = typeof soilProfiles.$inferInsert
export type SoilAmendment = typeof soilAmendments.$inferSelect
export type NewSoilAmendment = typeof soilAmendments.$inferInsert
export type SoilNote = typeof soilNotes.$inferSelect
export type NewSoilNote = typeof soilNotes.$inferInsert
export type WeatherLog = typeof weatherLogs.$inferSelect
export type NewWeatherLog = typeof weatherLogs.$inferInsert
