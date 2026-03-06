import { describe, it, expect } from "vitest";
import { formSchema } from "@/components/settings/farm-location-section";

describe("farm location form schema", () => {
  it("should accept valid complete form data", () => {
    const result = formSchema.safeParse({
      countyCity: "花蓮縣",
      districtTownship: "吉安鄉",
      locality: "中華段 123 號",
      elevationBand: "lowland",
      coastalInland: "coastal",
      farmLocationNotes: "靠近海邊",
      latitude: 23.9769,
      longitude: 121.6044,
    });
    expect(result.success).toBe(true);
  });

  it("should accept minimal form data (only required countyCity)", () => {
    const result = formSchema.safeParse({
      countyCity: "台北市",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty countyCity", () => {
    const result = formSchema.safeParse({
      countyCity: "",
    });
    expect(result.success).toBe(false);
  });

  it("should allow optional fields to be omitted", () => {
    const result = formSchema.safeParse({
      countyCity: "高雄市",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.districtTownship).toBeUndefined();
      expect(result.data.locality).toBeUndefined();
      expect(result.data.elevationBand).toBeUndefined();
      expect(result.data.coastalInland).toBeUndefined();
      expect(result.data.farmLocationNotes).toBeUndefined();
    }
  });

  it("should accept latitude as empty string", () => {
    const result = formSchema.safeParse({
      countyCity: "花蓮縣",
      latitude: "",
    });
    expect(result.success).toBe(true);
  });

  it("should accept longitude as empty string", () => {
    const result = formSchema.safeParse({
      countyCity: "花蓮縣",
      longitude: "",
    });
    expect(result.success).toBe(true);
  });

  it("should reject latitude below -90", () => {
    const result = formSchema.safeParse({
      countyCity: "花蓮縣",
      latitude: -91,
    });
    expect(result.success).toBe(false);
  });

  it("should reject latitude above 90", () => {
    const result = formSchema.safeParse({
      countyCity: "花蓮縣",
      latitude: 91,
    });
    expect(result.success).toBe(false);
  });

  it("should reject longitude below -180", () => {
    const result = formSchema.safeParse({
      countyCity: "花蓮縣",
      longitude: -181,
    });
    expect(result.success).toBe(false);
  });

  it("should reject longitude above 180", () => {
    const result = formSchema.safeParse({
      countyCity: "花蓮縣",
      longitude: 181,
    });
    expect(result.success).toBe(false);
  });

  it("should accept boundary latitude values (-90 and 90)", () => {
    expect(
      formSchema.safeParse({ countyCity: "花蓮縣", latitude: -90 }).success,
    ).toBe(true);
    expect(
      formSchema.safeParse({ countyCity: "花蓮縣", latitude: 90 }).success,
    ).toBe(true);
  });

  it("should accept boundary longitude values (-180 and 180)", () => {
    expect(
      formSchema.safeParse({ countyCity: "花蓮縣", longitude: -180 }).success,
    ).toBe(true);
    expect(
      formSchema.safeParse({ countyCity: "花蓮縣", longitude: 180 }).success,
    ).toBe(true);
  });
});
