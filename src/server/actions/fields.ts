'use server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/server/db'
import {
  cropPlacements,
  crops,
  facilities,
  fieldContexts,
  fields,
  plantedCrops,
  utilityEdges,
  utilityNodes,
} from '@/server/db/schema'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createFieldSchema = z.object({
  name: z.string().min(1),
  widthM: z.number().positive(),
  heightM: z.number().positive(),
  context: z
    .object({
      plotType: z.enum(['open_field', 'raised_bed', 'container', 'greenhouse']).optional(),
      sunHours: z.enum(['lt4', 'h4_6', 'h6_8', 'gt8']).optional(),
      drainage: z.enum(['poor', 'moderate', 'good']).optional(),
      slope: z.enum(['flat', 'gentle', 'steep']).optional(),
      windExposure: z.enum(['sheltered', 'moderate', 'exposed']).optional(),
    })
    .optional(),
})

const updateFieldSchema = z.object({
  name: z.string().min(1).optional(),
  widthM: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
})

const plantCropSchema = z.object({
  cropId: z.string().uuid(),
  xM: z.number().min(0),
  yM: z.number().min(0),
  widthM: z.number().positive(),
  heightM: z.number().positive(),
  shapePoints: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
})

const createRegionSchema = z.object({
  xM: z.number().min(0),
  yM: z.number().min(0),
  widthM: z.number().positive(),
  heightM: z.number().positive(),
  cropId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? undefined : v))
    .pipe(z.string().uuid().optional()),
  shapePoints: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
})

const updatePlantedCropSchema = z.object({
  notes: z.string().nullable().optional(),
  customGrowthDays: z.number().int().positive().nullable().optional(),
})

const updateCropPlacementSchema = z.object({
  xM: z.number().min(0).optional(),
  yM: z.number().min(0).optional(),
  widthM: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
  shapePoints: z
    .array(z.object({ x: z.number(), y: z.number() }))
    .nullable()
    .optional(),
})

const createFacilitySchema = z.object({
  facilityType: z.enum([
    'water_tank',
    'motor',
    'road',
    'tool_shed',
    'house',
    'custom',
  ]),
  name: z.string().min(1),
  xM: z.number().min(0),
  yM: z.number().min(0),
  widthM: z.number().positive(),
  heightM: z.number().positive(),
})

const updateFacilitySchema = z.object({
  facilityType: z
    .enum(['water_tank', 'motor', 'road', 'tool_shed', 'house', 'custom'])
    .optional(),
  name: z.string().min(1).optional(),
  xM: z.number().min(0).optional(),
  yM: z.number().min(0).optional(),
  widthM: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
})

const createUtilityNodeSchema = z.object({
  label: z.string().min(1),
  kind: z.enum(['water', 'electric']),
  nodeType: z.string().nullable().optional(),
  xM: z.number().min(0),
  yM: z.number().min(0),
})

const updateUtilityNodeSchema = z.object({
  label: z.string().min(1).optional(),
  kind: z.enum(['water', 'electric']).optional(),
  nodeType: z.string().nullable().optional(),
  xM: z.number().min(0).optional(),
  yM: z.number().min(0).optional(),
})

const createUtilityEdgeSchema = z.object({
  fromNodeId: z.string().uuid(),
  toNodeId: z.string().uuid(),
  kind: z.enum(['water', 'electric']),
})

// ---------------------------------------------------------------------------
// Field CRUD
// ---------------------------------------------------------------------------

export async function getFields(farmId: string) {
  const rows = await db
    .select()
    .from(fields)
    .where(eq(fields.farmId, farmId))

  const result = await Promise.all(
    rows.map(async (field) => {
      const [context, planted, placements, facs, nodes, edges] =
        await Promise.all([
          db
            .select()
            .from(fieldContexts)
            .where(eq(fieldContexts.fieldId, field.id))
            .then((r) => r[0] ?? null),
          db
            .select({
              plantedCrop: plantedCrops,
              crop: crops,
            })
            .from(plantedCrops)
            .leftJoin(crops, eq(plantedCrops.cropId, crops.id))
            .where(eq(plantedCrops.fieldId, field.id)),
          db
            .select()
            .from(cropPlacements)
            .where(eq(cropPlacements.fieldId, field.id)),
          db
            .select()
            .from(facilities)
            .where(eq(facilities.fieldId, field.id)),
          db
            .select()
            .from(utilityNodes)
            .where(eq(utilityNodes.fieldId, field.id)),
          db
            .select()
            .from(utilityEdges)
            .where(eq(utilityEdges.fieldId, field.id)),
        ])

      return {
        ...field,
        context,
        plantedCrops: planted,
        placements,
        facilities: facs,
        utilityNodes: nodes,
        utilityEdges: edges,
      }
    }),
  )

  return result
}

export async function getFieldById(id: string) {
  const field = await db
    .select()
    .from(fields)
    .where(eq(fields.id, id))
    .then((r) => r[0])

  if (!field) return null

  const [context, planted, placements, facs, nodes, edges] = await Promise.all([
    db
      .select()
      .from(fieldContexts)
      .where(eq(fieldContexts.fieldId, id))
      .then((r) => r[0] ?? null),
    db
      .select({
        plantedCrop: plantedCrops,
        crop: crops,
      })
      .from(plantedCrops)
      .leftJoin(crops, eq(plantedCrops.cropId, crops.id))
      .where(eq(plantedCrops.fieldId, id)),
    db
      .select()
      .from(cropPlacements)
      .where(eq(cropPlacements.fieldId, id)),
    db.select().from(facilities).where(eq(facilities.fieldId, id)),
    db.select().from(utilityNodes).where(eq(utilityNodes.fieldId, id)),
    db.select().from(utilityEdges).where(eq(utilityEdges.fieldId, id)),
  ])

  return {
    ...field,
    context,
    plantedCrops: planted,
    placements,
    facilities: facs,
    utilityNodes: nodes,
    utilityEdges: edges,
  }
}

export async function createField(
  farmId: string,
  data: z.infer<typeof createFieldSchema>,
) {
  const parsed = createFieldSchema.parse(data)

  const [field] = await db
    .insert(fields)
    .values({
      farmId,
      name: parsed.name,
      widthM: parsed.widthM,
      heightM: parsed.heightM,
    })
    .returning()

  if (parsed.context) {
    await db.insert(fieldContexts).values({
      fieldId: field.id,
      plotType: parsed.context.plotType,
      sunHours: parsed.context.sunHours,
      drainage: parsed.context.drainage,
      slope: parsed.context.slope,
      windExposure: parsed.context.windExposure,
    })
  }

  return field
}

export async function updateField(
  id: string,
  data: z.infer<typeof updateFieldSchema>,
) {
  const parsed = updateFieldSchema.parse(data)

  const [updated] = await db
    .update(fields)
    .set(parsed)
    .where(eq(fields.id, id))
    .returning()

  return updated
}

export async function updateFieldMemo(id: string, memo: string) {
  const [updated] = await db
    .update(fields)
    .set({ memo })
    .where(eq(fields.id, id))
    .returning()

  return updated
}

export async function deleteField(id: string) {
  // Delete children in dependency order
  // 1. utility_edges (references utility_nodes)
  await db.delete(utilityEdges).where(eq(utilityEdges.fieldId, id))
  // 2. utility_nodes
  await db.delete(utilityNodes).where(eq(utilityNodes.fieldId, id))
  // 3. crop_placements (references planted_crops)
  await db.delete(cropPlacements).where(eq(cropPlacements.fieldId, id))
  // 4. planted_crops
  await db.delete(plantedCrops).where(eq(plantedCrops.fieldId, id))
  // 5. facilities
  await db.delete(facilities).where(eq(facilities.fieldId, id))
  // 6. field_contexts
  await db.delete(fieldContexts).where(eq(fieldContexts.fieldId, id))
  // 7. field
  await db.delete(fields).where(eq(fields.id, id))
}

// ---------------------------------------------------------------------------
// Planted Crops
// ---------------------------------------------------------------------------

export async function plantCrop(
  fieldId: string,
  data: z.infer<typeof plantCropSchema>,
) {
  const parsed = plantCropSchema.parse(data)

  const [planted] = await db
    .insert(plantedCrops)
    .values({
      cropId: parsed.cropId,
      fieldId,
      plantedDate: new Date().toISOString().split('T')[0],
      status: 'growing',
    })
    .returning()

  const [placement] = await db
    .insert(cropPlacements)
    .values({
      plantedCropId: planted.id,
      fieldId,
      xM: parsed.xM,
      yM: parsed.yM,
      widthM: parsed.widthM,
      heightM: parsed.heightM,
      shapePoints: parsed.shapePoints ?? null,
    })
    .returning()

  return { plantedCrop: planted, placement }
}

export async function createRegion(
  fieldId: string,
  data: z.infer<typeof createRegionSchema>,
) {
  const parsed = createRegionSchema.parse(data)
  const resolvedCropId = parsed.cropId && parsed.cropId.length > 0 ? parsed.cropId : undefined

  const [planted] = await db
    .insert(plantedCrops)
    .values({
      ...(resolvedCropId ? { cropId: resolvedCropId } : {}),
      fieldId,
      plantedDate: new Date().toISOString().split('T')[0],
      status: 'growing',
    })
    .returning()

  const [placement] = await db
    .insert(cropPlacements)
    .values({
      plantedCropId: planted.id,
      fieldId,
      xM: parsed.xM,
      yM: parsed.yM,
      widthM: parsed.widthM,
      heightM: parsed.heightM,
      shapePoints: parsed.shapePoints ?? null,
    })
    .returning()

  return { plantedCrop: planted, placement }
}

export async function assignCropToRegion(plantedCropId: string, cropId: string) {
  const [updated] = await db
    .update(plantedCrops)
    .set({ cropId })
    .where(eq(plantedCrops.id, plantedCropId))
    .returning()

  return updated
}

export async function updatePlantedCrop(
  id: string,
  data: z.infer<typeof updatePlantedCropSchema>,
) {
  const parsed = updatePlantedCropSchema.parse(data)

  const [updated] = await db
    .update(plantedCrops)
    .set(parsed)
    .where(eq(plantedCrops.id, id))
    .returning()

  return updated
}

export async function harvestCrop(id: string) {
  const [updated] = await db
    .update(plantedCrops)
    .set({
      status: 'harvested',
      harvestedDate: new Date().toISOString().split('T')[0],
    })
    .where(eq(plantedCrops.id, id))
    .returning()

  return updated
}

export async function removePlantedCrop(id: string) {
  const [updated] = await db
    .update(plantedCrops)
    .set({ status: 'removed' })
    .where(eq(plantedCrops.id, id))
    .returning()

  return updated
}

export async function restorePlantedCrop(id: string) {
  const [updated] = await db
    .update(plantedCrops)
    .set({ status: 'growing' })
    .where(eq(plantedCrops.id, id))
    .returning()

  return updated
}

export async function updateCropPlacement(
  placementId: string,
  data: z.infer<typeof updateCropPlacementSchema>,
) {
  const parsed = updateCropPlacementSchema.parse(data)

  const [updated] = await db
    .update(cropPlacements)
    .set(parsed)
    .where(eq(cropPlacements.id, placementId))
    .returning()

  return updated
}

// ---------------------------------------------------------------------------
// Facilities
// ---------------------------------------------------------------------------

export async function createFacility(
  fieldId: string,
  data: z.infer<typeof createFacilitySchema>,
) {
  const parsed = createFacilitySchema.parse(data)

  const [facility] = await db
    .insert(facilities)
    .values({ fieldId, ...parsed })
    .returning()

  return facility
}

export async function updateFacility(
  id: string,
  data: z.infer<typeof updateFacilitySchema>,
) {
  const parsed = updateFacilitySchema.parse(data)

  const [updated] = await db
    .update(facilities)
    .set(parsed)
    .where(eq(facilities.id, id))
    .returning()

  return updated
}

export async function deleteFacility(id: string) {
  await db.delete(facilities).where(eq(facilities.id, id))
}

// ---------------------------------------------------------------------------
// Utility Nodes & Edges
// ---------------------------------------------------------------------------

export async function createUtilityNode(
  fieldId: string,
  data: z.infer<typeof createUtilityNodeSchema>,
) {
  const parsed = createUtilityNodeSchema.parse(data)

  const [node] = await db
    .insert(utilityNodes)
    .values({ fieldId, ...parsed })
    .returning()

  return node
}

export async function updateUtilityNode(
  id: string,
  data: z.infer<typeof updateUtilityNodeSchema>,
) {
  const parsed = updateUtilityNodeSchema.parse(data)

  const [updated] = await db
    .update(utilityNodes)
    .set(parsed)
    .where(eq(utilityNodes.id, id))
    .returning()

  return updated
}

export async function deleteUtilityNode(id: string) {
  // Delete edges referencing this node first
  await db
    .delete(utilityEdges)
    .where(eq(utilityEdges.fromNodeId, id))
  await db
    .delete(utilityEdges)
    .where(eq(utilityEdges.toNodeId, id))
  await db.delete(utilityNodes).where(eq(utilityNodes.id, id))
}

export async function createUtilityEdge(
  fieldId: string,
  data: z.infer<typeof createUtilityEdgeSchema>,
) {
  const parsed = createUtilityEdgeSchema.parse(data)

  const [edge] = await db
    .insert(utilityEdges)
    .values({ fieldId, ...parsed })
    .returning()

  return edge
}

export async function deleteUtilityEdge(id: string) {
  await db.delete(utilityEdges).where(eq(utilityEdges.id, id))
}
