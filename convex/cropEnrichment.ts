"use node";

import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

// === Types for structured AI responses ===

interface Pass1Result {
  scientificName: string | null;
  variety: string | null;
  aliases: string[];
  lifecycleType: string | null;
  propagationMethod: string | null;
  plantingMonths: number[];
  harvestMonths: number[];
  growthDays: number | null;
  daysToGermination: number | null;
  daysToTransplant: number | null;
  daysToFlowering: number | null;
  harvestWindowDays: number | null;
  growingSeasonStart: number | null;
  growingSeasonEnd: number | null;
}

interface Pass2Result {
  tempMin: number | null;
  tempMax: number | null;
  tempOptimalMin: number | null;
  tempOptimalMax: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  sunlight: string | null;
  sunlightHoursMin: number | null;
  sunlightHoursMax: number | null;
  windSensitivity: string | null;
  droughtTolerance: string | null;
  waterloggingTolerance: string | null;
  soilPhMin: number | null;
  soilPhMax: number | null;
  soilType: string | null;
  fertilityDemand: string | null;
  fertilizerType: string | null;
  fertilizerFrequencyDays: number | null;
  commonDeficiencies: string[];
}

interface Pass3Result {
  spacingPlantCm: number | null;
  spacingRowCm: number | null;
  maxHeightCm: number | null;
  maxSpreadCm: number | null;
  trellisRequired: boolean | null;
  pruningRequired: boolean | null;
  pruningFrequencyDays: number | null;
  water: string | null;
  waterFrequencyDays: number | null;
  waterAmountMl: number | null;
  criticalDroughtStages: string[];
}

interface PestDisease {
  name: string;
  symptoms: string;
  organicTreatment: string;
  triggerConditions: string;
}

interface Pass4Result {
  commonPests: PestDisease[];
  commonDiseases: PestDisease[];
  typhoonResistance: string | null;
  typhoonPrep: string | null;
}

interface Pass5Result {
  companionPlants: string[];
  antagonistPlants: string[];
  rotationFamily: string | null;
  rotationYears: number | null;
  harvestMaturitySigns: string | null;
  harvestMethod: string | null;
  harvestCadence: string | null;
  yieldPerPlant: string | null;
  storageNotes: string | null;
  shelfLifeDays: number | null;
}

interface GrowthStage {
  stage: string;
  daysFromStart: number;
  careNotes: string;
  waterFrequencyDays?: number;
  fertilizerFrequencyDays?: number;
}

interface Pass6Result {
  growthStages: GrowthStage[];
}

interface Pass7Result {
  howToPlant: string;
  howToCare: string;
  warnings: string;
  localNotes: string;
}

// === OpenRouter API call helper ===

const SYSTEM_PROMPT_BASE = `You are an agricultural expert specializing in subtropical farming in Taiwan.
You have deep knowledge of crop cultivation in 花蓮縣 (Hualien County), which has:
- Subtropical humid climate, sea level to 200m elevation
- Annual average temperature ~23°C
- Annual rainfall ~2000-2500mm
- Typhoon season June through October (most frequent July-September)
- Mild winters suitable for cool-season vegetables
- Eastern coast with abundant morning sunshine, afternoon thundershowers common
- Alluvial soils with good drainage

Respond ONLY with valid JSON matching the schema provided. Use null for fields you are not confident about. All text values should be in Traditional Chinese (繁體中文) unless they are scientific names or technical terms.`;

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://agrism.app",
      "X-Title": "Agrism Crop Enrichment",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenRouter response");
  }
  return content;
}

function parseJsonResponse<T>(raw: string): T {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as T;
}

// === Individual pass functions ===

async function runPass1(apiKey: string, cropName: string, category: string, location: string): Promise<Pass1Result> {
  const schema = `{
  "scientificName": "string or null",
  "variety": "string or null (品種名稱)",
  "aliases": ["string (別名)"],
  "lifecycleType": "annual|biennial|perennial|orchard",
  "propagationMethod": "seed|seedling|cutting|tuber|grafted|division",
  "plantingMonths": [1-12],
  "harvestMonths": [1-12],
  "growthDays": "number (seed to first harvest)",
  "daysToGermination": "number or null",
  "daysToTransplant": "number or null",
  "daysToFlowering": "number or null",
  "harvestWindowDays": "number or null",
  "growingSeasonStart": "number 1-12",
  "growingSeasonEnd": "number 1-12"
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})\nLocation: ${location}\n\nProvide identity and timing information. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass1Result>(raw);
}

async function runPass2(apiKey: string, cropName: string, category: string, location: string): Promise<Pass2Result> {
  const schema = `{
  "tempMin": "number (°C minimum viable)",
  "tempMax": "number (°C maximum viable)",
  "tempOptimalMin": "number (°C optimal low)",
  "tempOptimalMax": "number (°C optimal high)",
  "humidityMin": "number (% RH)",
  "humidityMax": "number (% RH)",
  "sunlight": "full_sun|partial_shade|shade",
  "sunlightHoursMin": "number",
  "sunlightHoursMax": "number",
  "windSensitivity": "low|medium|high",
  "droughtTolerance": "low|medium|high",
  "waterloggingTolerance": "low|medium|high",
  "soilPhMin": "number",
  "soilPhMax": "number",
  "soilType": "string (soil type description)",
  "fertilityDemand": "light|moderate|heavy",
  "fertilizerType": "string (recommended fertilizer type)",
  "fertilizerFrequencyDays": "number",
  "commonDeficiencies": ["string (nutrient deficiency names)"]
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})\nLocation: ${location}\n\nProvide environment and soil requirements. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass2Result>(raw);
}

async function runPass3(apiKey: string, cropName: string, category: string, location: string): Promise<Pass3Result> {
  const schema = `{
  "spacingPlantCm": "number (within row, cm)",
  "spacingRowCm": "number (between rows, cm)",
  "maxHeightCm": "number",
  "maxSpreadCm": "number",
  "trellisRequired": "boolean",
  "pruningRequired": "boolean",
  "pruningFrequencyDays": "number or null",
  "water": "low|moderate|high",
  "waterFrequencyDays": "number (base interval in days)",
  "waterAmountMl": "number or null (per watering session)",
  "criticalDroughtStages": ["string (growth stages where drought is most damaging)"]
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})\nLocation: ${location}\n\nProvide spacing, structure, and water requirements. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass3Result>(raw);
}

async function runPass4(apiKey: string, cropName: string, category: string, location: string): Promise<Pass4Result> {
  const schema = `{
  "commonPests": [{"name":"string","symptoms":"string","organicTreatment":"string","triggerConditions":"string"}],
  "commonDiseases": [{"name":"string","symptoms":"string","organicTreatment":"string","triggerConditions":"string"}],
  "typhoonResistance": "low|medium|high",
  "typhoonPrep": "string (typhoon preparation steps)"
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})\nLocation: ${location}\n\nProvide pest, disease, and typhoon information. Include at least 3 common pests and 3 common diseases relevant to this crop in Hualien. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass4Result>(raw);
}

async function runPass5(apiKey: string, cropName: string, category: string, location: string): Promise<Pass5Result> {
  const schema = `{
  "companionPlants": ["string (good companion plant names)"],
  "antagonistPlants": ["string (bad neighbor plant names)"],
  "rotationFamily": "string (crop rotation family, e.g., brassica, solanaceae, cucurbit, legume, allium, root)",
  "rotationYears": "number (years before replanting same family)",
  "harvestMaturitySigns": "string (how to know it is ready)",
  "harvestMethod": "string (cut|pull|pick|dig)",
  "harvestCadence": "once|continuous|multiple_flushes",
  "yieldPerPlant": "string (approximate yield, e.g., '200-500g')",
  "storageNotes": "string (how to store after harvest)",
  "shelfLifeDays": "number"
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})\nLocation: ${location}\n\nProvide companion planting, rotation, and harvest information. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass5Result>(raw);
}

async function runPass6(apiKey: string, cropName: string, category: string, location: string, growthDays: number | null): Promise<Pass6Result> {
  const schema = `{
  "growthStages": [
    {
      "stage": "string (e.g., germination, seedling, vegetative, flowering, fruiting, harvest, dormant)",
      "daysFromStart": "number (when this stage typically begins, day 0 = planting)",
      "careNotes": "string (what to do during this stage)",
      "waterFrequencyDays": "number (stage-specific watering interval, optional)",
      "fertilizerFrequencyDays": "number (stage-specific fertilizer interval, optional)"
    }
  ]
}`;

  const daysContext = growthDays ? `Total growth days: approximately ${growthDays} days.` : "";

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})\nLocation: ${location}\n${daysContext}\n\nProvide a detailed growth stages timeline. Include all major stages from planting to harvest. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass6Result>(raw);
}

async function runPass7(
  apiKey: string,
  cropName: string,
  category: string,
  location: string,
  previousData: string,
): Promise<Pass7Result> {
  const schema = `{
  "howToPlant": "string (markdown — sowing method, soil prep, transplanting tips)",
  "howToCare": "string (markdown — daily/weekly care routine)",
  "warnings": "string (markdown — common mistakes, risk factors, things to watch out for)",
  "localNotes": "string (markdown — location-specific advice for Hualien farming)"
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})\nLocation: ${location}\n\nHere is all the data gathered about this crop so far:\n${previousData}\n\nUsing this data, generate a comprehensive growing guide in markdown format. The guide should be practical, actionable, and specific to farming in Hualien. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass7Result>(raw);
}

// === Merge pass results into a crop update object ===

function cleanNulls(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function cleanArrayItems(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items.map((item) => cleanNulls(item));
}

function mergeResults(
  pass1: Pass1Result,
  pass2: Pass2Result,
  pass3: Pass3Result,
  pass4: Pass4Result,
  pass5: Pass5Result,
  pass6: Pass6Result,
  pass7: Pass7Result,
): Record<string, unknown> {
  const merged = cleanNulls({
    // Pass 1 — Identity + Timing
    scientificName: pass1.scientificName,
    variety: pass1.variety,
    aliases: pass1.aliases?.length ? pass1.aliases : undefined,
    lifecycleType: pass1.lifecycleType,
    propagationMethod: pass1.propagationMethod,
    plantingMonths: pass1.plantingMonths?.length ? pass1.plantingMonths : undefined,
    harvestMonths: pass1.harvestMonths?.length ? pass1.harvestMonths : undefined,
    growthDays: pass1.growthDays,
    daysToGermination: pass1.daysToGermination,
    daysToTransplant: pass1.daysToTransplant,
    daysToFlowering: pass1.daysToFlowering,
    harvestWindowDays: pass1.harvestWindowDays,
    growingSeasonStart: pass1.growingSeasonStart,
    growingSeasonEnd: pass1.growingSeasonEnd,

    // Pass 2 — Environment + Soil
    tempMin: pass2.tempMin,
    tempMax: pass2.tempMax,
    tempOptimalMin: pass2.tempOptimalMin,
    tempOptimalMax: pass2.tempOptimalMax,
    humidityMin: pass2.humidityMin,
    humidityMax: pass2.humidityMax,
    sunlight: pass2.sunlight,
    sunlightHoursMin: pass2.sunlightHoursMin,
    sunlightHoursMax: pass2.sunlightHoursMax,
    windSensitivity: pass2.windSensitivity,
    droughtTolerance: pass2.droughtTolerance,
    waterloggingTolerance: pass2.waterloggingTolerance,
    soilPhMin: pass2.soilPhMin,
    soilPhMax: pass2.soilPhMax,
    soilType: pass2.soilType,
    fertilityDemand: pass2.fertilityDemand,
    fertilizerType: pass2.fertilizerType,
    fertilizerFrequencyDays: pass2.fertilizerFrequencyDays,
    commonDeficiencies: pass2.commonDeficiencies?.length ? pass2.commonDeficiencies : undefined,

    // Pass 3 — Spacing + Water + Structure
    spacingPlantCm: pass3.spacingPlantCm,
    spacingRowCm: pass3.spacingRowCm,
    maxHeightCm: pass3.maxHeightCm,
    maxSpreadCm: pass3.maxSpreadCm,
    trellisRequired: pass3.trellisRequired,
    pruningRequired: pass3.pruningRequired,
    pruningFrequencyDays: pass3.pruningFrequencyDays,
    water: pass3.water,
    waterFrequencyDays: pass3.waterFrequencyDays,
    waterAmountMl: pass3.waterAmountMl,
    criticalDroughtStages: pass3.criticalDroughtStages?.length ? pass3.criticalDroughtStages : undefined,

    // Pass 4 — Pest + Disease + Typhoon
    commonPests: pass4.commonPests?.length ? cleanArrayItems(pass4.commonPests as unknown as Record<string, unknown>[]) : undefined,
    commonDiseases: pass4.commonDiseases?.length ? cleanArrayItems(pass4.commonDiseases as unknown as Record<string, unknown>[]) : undefined,
    typhoonResistance: pass4.typhoonResistance,
    typhoonPrep: pass4.typhoonPrep,

    // Pass 5 — Companion + Rotation + Harvest
    companionPlants: pass5.companionPlants?.length ? pass5.companionPlants : undefined,
    antagonistPlants: pass5.antagonistPlants?.length ? pass5.antagonistPlants : undefined,
    rotationFamily: pass5.rotationFamily,
    rotationYears: pass5.rotationYears,
    harvestMaturitySigns: pass5.harvestMaturitySigns,
    harvestMethod: pass5.harvestMethod,
    harvestCadence: pass5.harvestCadence,
    yieldPerPlant: pass5.yieldPerPlant,
    storageNotes: pass5.storageNotes,
    shelfLifeDays: pass5.shelfLifeDays,

    // Pass 6 — Growth Stages
    growthStages: pass6.growthStages?.length ? cleanArrayItems(pass6.growthStages as unknown as Record<string, unknown>[]) : undefined,

    // Pass 7 — Growing Guide
    growingGuide: {
      howToPlant: pass7.howToPlant || undefined,
      howToCare: pass7.howToCare || undefined,
      warnings: pass7.warnings || undefined,
      localNotes: pass7.localNotes || undefined,
    },

    // Meta
    lastAiEnriched: Date.now(),
    source: "ai-imported",
  });

  return merged;
}

// === Main enrichment action ===

export const enrichCrop = action({
  args: {
    cropId: v.id("crops"),
  },
  handler: async (ctx, { cropId }): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }

    // Fetch the crop to get its name and category (internal — no auth required)
    const crop = await ctx.runQuery(internal.crops.getByIdInternal, { cropId });
    if (!crop) {
      throw new Error("Crop not found");
    }

    const cropName = crop.name;
    const category = crop.category;
    const location = "花蓮縣 (Hualien County, subtropical, humid, typhoon season Jun-Oct, mild winter, sea level to 200m)";

    try {
      // Run passes 1-3 in parallel (independent)
      const [pass1, pass2, pass3] = await Promise.all([
        runPass1(apiKey, cropName, category, location),
        runPass2(apiKey, cropName, category, location),
        runPass3(apiKey, cropName, category, location),
      ]);

      // Run passes 4-5 in parallel (independent)
      const [pass4, pass5] = await Promise.all([
        runPass4(apiKey, cropName, category, location),
        runPass5(apiKey, cropName, category, location),
      ]);

      // Pass 6 depends on pass1 for growthDays
      const pass6 = await runPass6(apiKey, cropName, category, location, pass1.growthDays);

      // Pass 7 depends on all previous passes
      const previousDataSummary = JSON.stringify({ pass1, pass2, pass3, pass4, pass5, pass6 }, null, 2);
      const pass7 = await runPass7(apiKey, cropName, category, location, previousDataSummary);

      // Merge all results
      const enrichmentData = mergeResults(pass1, pass2, pass3, pass4, pass5, pass6, pass7);

      // Save to database via internal mutation (bypasses auth since action already verified)
      await ctx.runMutation(internal.crops.applyEnrichment, {
        cropId,
        ...enrichmentData,
      } as never);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Enrichment failed for crop ${cropName}:`, message);
      return { success: false, error: message };
    }
  },
});

// === Batch enrichment for seeding all default crops ===

export const enrichAllDefaults = action({
  args: {
    farmId: v.id("farms"),
  },
  handler: async (ctx, { farmId }): Promise<{ total: number; succeeded: number; failed: string[] }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all crops for this farm
    const crops = await ctx.runQuery(internal.crops.listByFarmInternal, { farmId });
    const defaultCrops = crops.filter((c: { isDefault: boolean }) => c.isDefault);

    const failed: string[] = [];
    let succeeded = 0;

    // Process one at a time to avoid rate limits
    for (const crop of defaultCrops) {
      try {
        const result = await ctx.runAction(api.cropEnrichment.enrichCrop, {
          cropId: crop._id,
        });
        if (result.success) {
          succeeded++;
        } else {
          failed.push(`${crop.name}: ${result.error}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push(`${crop.name}: ${message}`);
      }
    }

    return {
      total: defaultCrops.length,
      succeeded,
      failed,
    };
  },
});

// === CLI-callable action: find all farms, enrich all default crops ===

export const enrichAllCrops = internalAction({
  args: {},
  handler: async (ctx): Promise<{ farms: number; total: number; succeeded: number; failed: string[] }> => {
    const farms = await ctx.runQuery(internal.crops.listAllFarmsInternal, {});
    let total = 0;
    let succeeded = 0;
    const failed: string[] = [];

    for (const farm of farms) {
      console.log(`Processing farm: ${farm.name} (${farm._id})`);
      const result = await ctx.runAction(internal.cropEnrichment.enrichAllDefaultsInternal, {
        farmId: farm._id,
      });
      total += result.total;
      succeeded += result.succeeded;
      failed.push(...result.failed);
    }

    return { farms: farms.length, total, succeeded, failed };
  },
});

export const enrichAllDefaultsInternal = internalAction({
  args: {
    farmId: v.id("farms"),
  },
  handler: async (ctx, { farmId }): Promise<{ total: number; succeeded: number; failed: string[] }> => {
    const crops = await ctx.runQuery(internal.crops.listByFarmInternal, { farmId });
    const defaultCrops = crops.filter((c: { isDefault: boolean }) => c.isDefault);

    const failed: string[] = [];
    let succeeded = 0;

    for (const crop of defaultCrops) {
      try {
        const result = await ctx.runAction(api.cropEnrichment.enrichCrop, {
          cropId: crop._id,
        });
        if (result.success) {
          succeeded++;
          console.log(`Enriched: ${crop.name}`);
        } else {
          failed.push(`${crop.name}: ${result.error}`);
          console.error(`Failed: ${crop.name}: ${result.error}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push(`${crop.name}: ${message}`);
        console.error(`Failed: ${crop.name}: ${message}`);
      }
    }

    return {
      total: defaultCrops.length,
      succeeded,
      failed,
    };
  },
});
