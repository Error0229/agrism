import type { SoilAmendment, SoilProfile, SoilTexture } from "@/lib/types";

export const defaultSoilTexture: SoilTexture = "loam";

const textureOptions = new Set<SoilTexture>(["sand", "loam", "clay", "silty", "mixed"]);

function asFiniteOrNull(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

function asDate(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

export function normalizeSoilProfile(input: Partial<SoilProfile> & { fieldId: string }): SoilProfile {
  const now = new Date().toISOString();
  return {
    fieldId: input.fieldId,
    texture: textureOptions.has(input.texture as SoilTexture) ? (input.texture as SoilTexture) : defaultSoilTexture,
    ph: asFiniteOrNull(input.ph, 0, 14),
    ec: asFiniteOrNull(input.ec, 0, 20),
    organicMatterPct: asFiniteOrNull(input.organicMatterPct, 0, 100),
    updatedAt: asDate(input.updatedAt, now),
  };
}

export function normalizeSoilAmendment(input: Partial<SoilAmendment> & { id: string; fieldId: string }): SoilAmendment {
  const now = new Date().toISOString();
  return {
    id: input.id,
    fieldId: input.fieldId,
    date: asDate(input.date, now),
    amendmentType: String(input.amendmentType ?? "").trim() || "未命名改良資材",
    quantity: asFiniteOrNull(input.quantity, 0, 100000) ?? 0,
    unit: String(input.unit ?? "").trim() || "kg",
    notes: input.notes ? String(input.notes).trim() : undefined,
  };
}

export function summarizeSoilRiskFlags(profile: SoilProfile): string[] {
  const flags: string[] = [];
  if (profile.ph !== null && profile.ph < 5.5) flags.push("土壤偏酸，留意石灰或有機質調整。");
  if (profile.ph !== null && profile.ph > 7.5) flags.push("土壤偏鹼，留意微量元素吸收限制。");
  if (profile.ec !== null && profile.ec > 2) flags.push("土壤鹽分偏高，建議加強灌排與沖洗。");
  if (profile.organicMatterPct !== null && profile.organicMatterPct < 2) {
    flags.push("有機質偏低，可增加堆肥或覆蓋作物。");
  }
  return flags;
}
