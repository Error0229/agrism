"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// === Types for evidence-backed AI responses ===

interface FieldWithConfidence<T = unknown> {
  value: T | null;
  confidence: "high" | "medium" | "low";
}

interface Pass1Result {
  fields: {
    scientificName: FieldWithConfidence<string>;
    aliases: FieldWithConfidence<string[]>;
    lifecycleType: FieldWithConfidence<string>;
    propagationMethod: FieldWithConfidence<string>;
    growthDays: FieldWithConfidence<number>;
    daysToGermination: FieldWithConfidence<number>;
  };
}

interface Pass2Result {
  fields: {
    plantingMonths: FieldWithConfidence<number[]>;
    harvestMonths: FieldWithConfidence<number[]>;
    tempMin: FieldWithConfidence<number>;
    tempMax: FieldWithConfidence<number>;
    tempOptimalMin: FieldWithConfidence<number>;
    tempOptimalMax: FieldWithConfidence<number>;
    sunlight: FieldWithConfidence<string>;
    water: FieldWithConfidence<string>;
    soilPhMin: FieldWithConfidence<number>;
    soilPhMax: FieldWithConfidence<number>;
    spacingPlantCm: FieldWithConfidence<number>;
    spacingRowCm: FieldWithConfidence<number>;
  };
}

interface PestDisease {
  name: string;
  symptoms: string;
  organicTreatment: string;
  triggerConditions: string;
}

interface Pass3Result {
  fields: {
    commonPests: FieldWithConfidence<PestDisease[]>;
    commonDiseases: FieldWithConfidence<PestDisease[]>;
    harvestMaturitySigns: FieldWithConfidence<string>;
    companionPlants: FieldWithConfidence<string[]>;
    rotationFamily: FieldWithConfidence<string>;
  };
}

interface Pass4Result {
  fields: {
    typhoonResistance: FieldWithConfidence<string>;
    typhoonPrep: FieldWithConfidence<string>;
    growingGuide: FieldWithConfidence<{
      howToPlant: string;
      howToCare: string;
      warnings: string;
      localNotes: string;
    }>;
  };
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

IMPORTANT: For each field you provide, you MUST rate your confidence:
- "high": well-established fact, widely documented
- "medium": likely correct based on your knowledge, but not 100% certain
- "low": uncertain or estimated — treat with caution

If you are truly unsure about a value, set it to null rather than guessing.
All text values should be in Traditional Chinese (繁體中文) unless they are scientific names or technical terms.
Respond ONLY with valid JSON matching the schema provided.`;

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
      "X-Title": "Agrism Crop Import",
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
    throw new Error(`OpenRouter API 錯誤: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter 回應中無內容");
  }
  return content;
}

function parseJsonResponse<T>(raw: string): T {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as T;
}

// === Individual pass functions ===

async function runPass1(
  apiKey: string,
  cropName: string,
  category: string,
  location: string,
  variety?: string,
): Promise<Pass1Result> {
  const varietyContext = variety ? `\n品種 (Variety): ${variety}` : "";
  const schema = `{
  "fields": {
    "scientificName": { "value": "string or null", "confidence": "high|medium|low" },
    "aliases": { "value": ["string (別名)"] or null, "confidence": "high|medium|low" },
    "lifecycleType": { "value": "annual|biennial|perennial|orchard or null", "confidence": "high|medium|low" },
    "propagationMethod": { "value": "seed|seedling|cutting|tuber|grafted|division or null", "confidence": "high|medium|low" },
    "growthDays": { "value": "number (seed to first harvest) or null", "confidence": "high|medium|low" },
    "daysToGermination": { "value": "number or null", "confidence": "high|medium|low" }
  }
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})${varietyContext}\nLocation: ${location}\n\nProvide identity and lifecycle information for this crop. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass1Result>(raw);
}

async function runPass2(
  apiKey: string,
  cropName: string,
  category: string,
  location: string,
  variety?: string,
): Promise<Pass2Result> {
  const varietyContext = variety ? `\n品種 (Variety): ${variety}` : "";
  const schema = `{
  "fields": {
    "plantingMonths": { "value": [1-12] or null, "confidence": "high|medium|low" },
    "harvestMonths": { "value": [1-12] or null, "confidence": "high|medium|low" },
    "tempMin": { "value": "number (°C) or null", "confidence": "high|medium|low" },
    "tempMax": { "value": "number (°C) or null", "confidence": "high|medium|low" },
    "tempOptimalMin": { "value": "number (°C) or null", "confidence": "high|medium|low" },
    "tempOptimalMax": { "value": "number (°C) or null", "confidence": "high|medium|low" },
    "sunlight": { "value": "full_sun|partial_shade|shade or null", "confidence": "high|medium|low" },
    "water": { "value": "low|moderate|high or null", "confidence": "high|medium|low" },
    "soilPhMin": { "value": "number or null", "confidence": "high|medium|low" },
    "soilPhMax": { "value": "number or null", "confidence": "high|medium|low" },
    "spacingPlantCm": { "value": "number or null", "confidence": "high|medium|low" },
    "spacingRowCm": { "value": "number or null", "confidence": "high|medium|low" }
  }
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})${varietyContext}\nLocation: ${location}\n\nProvide environment, timing, and spacing requirements. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass2Result>(raw);
}

async function runPass3(
  apiKey: string,
  cropName: string,
  category: string,
  location: string,
  variety?: string,
): Promise<Pass3Result> {
  const varietyContext = variety ? `\n品種 (Variety): ${variety}` : "";
  const schema = `{
  "fields": {
    "commonPests": { "value": [{"name":"string","symptoms":"string","organicTreatment":"string","triggerConditions":"string"}] or null, "confidence": "high|medium|low" },
    "commonDiseases": { "value": [{"name":"string","symptoms":"string","organicTreatment":"string","triggerConditions":"string"}] or null, "confidence": "high|medium|low" },
    "harvestMaturitySigns": { "value": "string or null", "confidence": "high|medium|low" },
    "companionPlants": { "value": ["string"] or null, "confidence": "high|medium|low" },
    "rotationFamily": { "value": "brassica|solanaceae|cucurbit|legume|allium|root or null", "confidence": "high|medium|low" }
  }
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})${varietyContext}\nLocation: ${location}\n\nProvide pest, disease, harvest, companion plant, and rotation information. Include at least 2-3 common pests and diseases relevant to this crop in Hualien. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass3Result>(raw);
}

async function runPass4(
  apiKey: string,
  cropName: string,
  category: string,
  location: string,
  variety?: string,
  previousData?: string,
): Promise<Pass4Result> {
  const varietyContext = variety ? `\n品種 (Variety): ${variety}` : "";
  const prevContext = previousData
    ? `\nHere is data gathered from previous research passes:\n${previousData}\n`
    : "";
  const schema = `{
  "fields": {
    "typhoonResistance": { "value": "low|medium|high or null", "confidence": "high|medium|low" },
    "typhoonPrep": { "value": "string (typhoon preparation steps for this crop in Hualien) or null", "confidence": "high|medium|low" },
    "growingGuide": { "value": { "howToPlant": "string (markdown)", "howToCare": "string (markdown)", "warnings": "string (markdown)", "localNotes": "string (markdown — Hualien-specific advice)" } or null, "confidence": "high|medium|low" }
  }
}`;

  const raw = await callOpenRouter(
    apiKey,
    SYSTEM_PROMPT_BASE,
    `Crop: ${cropName} (category: ${category})${varietyContext}\nLocation: ${location}\n${prevContext}\nProvide Hualien-specific local adaptation information: typhoon resistance, local growing tips, and a comprehensive growing guide. Return JSON matching this schema:\n${schema}`,
  );
  return parseJsonResponse<Pass4Result>(raw);
}

// === Merge results with field metadata ===

type FieldMeta = Record<string, {
  confidence?: string;
  sources?: string[];
  origin?: string;
  lastVerified?: number;
}>;

function extractValue<T>(field: FieldWithConfidence<T> | undefined): T | null {
  if (!field) return null;
  return field.value ?? null;
}

function extractConfidence(field: FieldWithConfidence | undefined): string {
  return field?.confidence ?? "low";
}

function setMeta(
  meta: FieldMeta,
  fieldName: string,
  confidence: string,
  now: number,
): void {
  meta[fieldName] = {
    confidence,
    origin: "imported",
    lastVerified: now,
  };
}

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

function mergeImportResults(
  name: string,
  category: string,
  farmId: string,
  variety: string | undefined,
  pass1: Pass1Result,
  pass2: Pass2Result,
  pass3: Pass3Result,
  pass4: Pass4Result,
): { cropData: Record<string, unknown>; fieldMeta: FieldMeta } {
  const now = Date.now();
  const fieldMeta: FieldMeta = {};

  // Helper to set a field value + its metadata
  const set = (fieldName: string, value: unknown, confidence: string) => {
    if (value !== null && value !== undefined) {
      setMeta(fieldMeta, fieldName, confidence, now);
    }
  };

  // Pass 1 — Identity & Lifecycle
  const scientificName = extractValue(pass1.fields.scientificName);
  set("scientificName", scientificName, extractConfidence(pass1.fields.scientificName));

  const aliases = extractValue(pass1.fields.aliases);
  set("aliases", aliases, extractConfidence(pass1.fields.aliases));

  const lifecycleType = extractValue(pass1.fields.lifecycleType);
  set("lifecycleType", lifecycleType, extractConfidence(pass1.fields.lifecycleType));

  const propagationMethod = extractValue(pass1.fields.propagationMethod);
  set("propagationMethod", propagationMethod, extractConfidence(pass1.fields.propagationMethod));

  const growthDays = extractValue(pass1.fields.growthDays);
  set("growthDays", growthDays, extractConfidence(pass1.fields.growthDays));

  const daysToGermination = extractValue(pass1.fields.daysToGermination);
  set("daysToGermination", daysToGermination, extractConfidence(pass1.fields.daysToGermination));

  // Pass 2 — Environment & Timing
  const plantingMonths = extractValue(pass2.fields.plantingMonths);
  set("plantingMonths", plantingMonths, extractConfidence(pass2.fields.plantingMonths));

  const harvestMonths = extractValue(pass2.fields.harvestMonths);
  set("harvestMonths", harvestMonths, extractConfidence(pass2.fields.harvestMonths));

  const tempMin = extractValue(pass2.fields.tempMin);
  set("tempMin", tempMin, extractConfidence(pass2.fields.tempMin));

  const tempMax = extractValue(pass2.fields.tempMax);
  set("tempMax", tempMax, extractConfidence(pass2.fields.tempMax));

  const tempOptimalMin = extractValue(pass2.fields.tempOptimalMin);
  set("tempOptimalMin", tempOptimalMin, extractConfidence(pass2.fields.tempOptimalMin));

  const tempOptimalMax = extractValue(pass2.fields.tempOptimalMax);
  set("tempOptimalMax", tempOptimalMax, extractConfidence(pass2.fields.tempOptimalMax));

  const sunlight = extractValue(pass2.fields.sunlight);
  set("sunlight", sunlight, extractConfidence(pass2.fields.sunlight));

  const water = extractValue(pass2.fields.water);
  set("water", water, extractConfidence(pass2.fields.water));

  const soilPhMin = extractValue(pass2.fields.soilPhMin);
  set("soilPhMin", soilPhMin, extractConfidence(pass2.fields.soilPhMin));

  const soilPhMax = extractValue(pass2.fields.soilPhMax);
  set("soilPhMax", soilPhMax, extractConfidence(pass2.fields.soilPhMax));

  const spacingPlantCm = extractValue(pass2.fields.spacingPlantCm);
  set("spacingPlantCm", spacingPlantCm, extractConfidence(pass2.fields.spacingPlantCm));

  const spacingRowCm = extractValue(pass2.fields.spacingRowCm);
  set("spacingRowCm", spacingRowCm, extractConfidence(pass2.fields.spacingRowCm));

  // Pass 3 — Pest, Disease & Harvest
  const commonPests = extractValue(pass3.fields.commonPests);
  set("commonPests", commonPests, extractConfidence(pass3.fields.commonPests));

  const commonDiseases = extractValue(pass3.fields.commonDiseases);
  set("commonDiseases", commonDiseases, extractConfidence(pass3.fields.commonDiseases));

  const harvestMaturitySigns = extractValue(pass3.fields.harvestMaturitySigns);
  set("harvestMaturitySigns", harvestMaturitySigns, extractConfidence(pass3.fields.harvestMaturitySigns));

  const companionPlants = extractValue(pass3.fields.companionPlants);
  set("companionPlants", companionPlants, extractConfidence(pass3.fields.companionPlants));

  const rotationFamily = extractValue(pass3.fields.rotationFamily);
  set("rotationFamily", rotationFamily, extractConfidence(pass3.fields.rotationFamily));

  // Pass 4 — Local Adaptation
  const typhoonResistance = extractValue(pass4.fields.typhoonResistance);
  set("typhoonResistance", typhoonResistance, extractConfidence(pass4.fields.typhoonResistance));

  const typhoonPrep = extractValue(pass4.fields.typhoonPrep);
  set("typhoonPrep", typhoonPrep, extractConfidence(pass4.fields.typhoonPrep));

  const growingGuideRaw = extractValue(pass4.fields.growingGuide);
  set("growingGuide", growingGuideRaw, extractConfidence(pass4.fields.growingGuide));

  // Build crop data
  const cropData = cleanNulls({
    farmId,
    name,
    category,
    variety: variety || undefined,
    isDefault: false,
    source: "ai-imported",
    importStatus: "pending_review",

    // Pass 1
    scientificName,
    aliases: aliases?.length ? aliases : undefined,
    lifecycleType,
    propagationMethod,
    growthDays,
    daysToGermination,

    // Pass 2
    plantingMonths: plantingMonths?.length ? plantingMonths : undefined,
    harvestMonths: harvestMonths?.length ? harvestMonths : undefined,
    tempMin,
    tempMax,
    tempOptimalMin,
    tempOptimalMax,
    sunlight,
    water,
    soilPhMin,
    soilPhMax,
    spacingPlantCm,
    spacingRowCm,

    // Pass 3
    commonPests: commonPests?.length
      ? cleanArrayItems(commonPests as unknown as Record<string, unknown>[])
      : undefined,
    commonDiseases: commonDiseases?.length
      ? cleanArrayItems(commonDiseases as unknown as Record<string, unknown>[])
      : undefined,
    harvestMaturitySigns,
    companionPlants: companionPlants?.length ? companionPlants : undefined,
    rotationFamily,

    // Pass 4
    typhoonResistance,
    typhoonPrep,
    growingGuide: growingGuideRaw
      ? {
          howToPlant: growingGuideRaw.howToPlant || undefined,
          howToCare: growingGuideRaw.howToCare || undefined,
          warnings: growingGuideRaw.warnings || undefined,
          localNotes: growingGuideRaw.localNotes || undefined,
        }
      : undefined,

    // Meta
    lastAiEnriched: now,
    fieldMeta,
  });

  return { cropData, fieldMeta };
}

// === Main import action ===

export const importCropWithEvidence = action({
  args: {
    name: v.string(),
    category: v.string(),
    farmId: v.id("farms"),
    variety: v.optional(v.string()),
  },
  handler: async (ctx, { name, category, farmId, variety }): Promise<{ success: boolean; cropId?: string; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("未登入，無法執行此操作");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY 環境變數未設定");
    }

    const location = "花蓮縣 (Hualien County, subtropical, humid, typhoon season Jun-Oct, mild winter, sea level to 200m)";

    try {
      // Run passes 1-3 in parallel (independent)
      const [pass1, pass2, pass3] = await Promise.all([
        runPass1(apiKey, name, category, location, variety),
        runPass2(apiKey, name, category, location, variety),
        runPass3(apiKey, name, category, location, variety),
      ]);

      // Pass 4 depends on passes 1-3 (references their results for local adaptation)
      const previousDataSummary = JSON.stringify({ pass1, pass2, pass3 }, null, 2);
      const pass4 = await runPass4(apiKey, name, category, location, variety, previousDataSummary);

      // Merge all results
      const { cropData } = mergeImportResults(
        name,
        category,
        farmId,
        variety,
        pass1,
        pass2,
        pass3,
        pass4,
      );

      // Save to database via internal mutation (in crops.ts)
      const cropId = await ctx.runMutation(internal.crops.saveDraftCrop, cropData as never);

      return { success: true, cropId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`作物匯入失敗 ${name}:`, message);
      return { success: false, error: message };
    }
  },
});
