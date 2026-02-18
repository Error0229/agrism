export interface UtilityVisibilitySettings {
  showUtilities: boolean;
  showWaterUtilities: boolean;
  showElectricUtilities: boolean;
}

export const defaultUtilityVisibilitySettings: UtilityVisibilitySettings = {
  showUtilities: true,
  showWaterUtilities: true,
  showElectricUtilities: true,
};

export function normalizeUtilityVisibilitySettings(input: unknown): UtilityVisibilitySettings {
  if (!input || typeof input !== "object") return defaultUtilityVisibilitySettings;
  const raw = input as Partial<UtilityVisibilitySettings>;
  return {
    showUtilities:
      typeof raw.showUtilities === "boolean" ? raw.showUtilities : defaultUtilityVisibilitySettings.showUtilities,
    showWaterUtilities:
      typeof raw.showWaterUtilities === "boolean"
        ? raw.showWaterUtilities
        : defaultUtilityVisibilitySettings.showWaterUtilities,
    showElectricUtilities:
      typeof raw.showElectricUtilities === "boolean"
        ? raw.showElectricUtilities
        : defaultUtilityVisibilitySettings.showElectricUtilities,
  };
}
