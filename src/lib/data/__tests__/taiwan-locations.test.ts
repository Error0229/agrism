import { describe, it, expect } from "vitest";
import {
  TAIWAN_COUNTIES,
  ELEVATION_BANDS,
  COASTAL_INLAND_OPTIONS,
} from "@/lib/data/taiwan-locations";

describe("TAIWAN_COUNTIES", () => {
  it("should have non-empty township arrays for all counties", () => {
    for (const [county, townships] of Object.entries(TAIWAN_COUNTIES)) {
      expect(townships.length, `${county} has no townships`).toBeGreaterThan(0);
    }
  });

  const HUALIEN_TOWNSHIPS = [
    "花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉",
    "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉",
  ];

  it("should contain all 13 Hualien townships", () => {
    const townships = TAIWAN_COUNTIES["花蓮縣"];
    expect(townships).toBeDefined();
    expect(townships).toHaveLength(13);
    for (const t of HUALIEN_TOWNSHIPS) {
      expect(townships).toContain(t);
    }
  });

  it("should have no duplicate county names", () => {
    const countyNames = Object.keys(TAIWAN_COUNTIES);
    expect(new Set(countyNames).size).toBe(countyNames.length);
  });

  it("should have no duplicate townships within any county", () => {
    for (const [county, townships] of Object.entries(TAIWAN_COUNTIES)) {
      expect(
        new Set(townships).size,
        `${county} has duplicate townships`,
      ).toBe(townships.length);
    }
  });
});

describe("ELEVATION_BANDS", () => {
  it("should have entries with value and label", () => {
    expect(ELEVATION_BANDS.length).toBeGreaterThan(0);
    for (const band of ELEVATION_BANDS) {
      expect(band.value).toBeTruthy();
      expect(band.label).toBeTruthy();
    }
  });
});

describe("COASTAL_INLAND_OPTIONS", () => {
  it("should have entries with value and label", () => {
    expect(COASTAL_INLAND_OPTIONS.length).toBeGreaterThan(0);
    for (const opt of COASTAL_INLAND_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });
});
