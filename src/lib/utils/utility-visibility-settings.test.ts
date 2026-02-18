import { describe, expect, it } from "vitest";
import {
  defaultUtilityVisibilitySettings,
  normalizeUtilityVisibilitySettings,
} from "@/lib/utils/utility-visibility-settings";

describe("utility visibility settings normalization", () => {
  it("returns defaults for invalid input", () => {
    expect(normalizeUtilityVisibilitySettings(undefined)).toEqual(defaultUtilityVisibilitySettings);
    expect(normalizeUtilityVisibilitySettings("invalid")).toEqual(defaultUtilityVisibilitySettings);
  });

  it("keeps valid boolean settings and falls back invalid fields", () => {
    expect(
      normalizeUtilityVisibilitySettings({
        showUtilities: false,
        showWaterUtilities: true,
        showElectricUtilities: "bad",
      })
    ).toEqual({
      showUtilities: false,
      showWaterUtilities: true,
      showElectricUtilities: true,
    });
  });
});
