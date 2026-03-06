import { describe, it, expect } from "vitest";
import {
  buildGeographyKeys,
  granularityFromKey,
  resolveFactsFromProfiles,
} from "../../../convex/cropProfileResolver";

describe("buildGeographyKeys", () => {
  it("returns empty array when no country", () => {
    expect(buildGeographyKeys({})).toEqual([]);
  });

  it("returns country key only", () => {
    expect(buildGeographyKeys({ country: "TW" })).toEqual(["TW"]);
  });

  it("handles Traditional Chinese country names", () => {
    expect(buildGeographyKeys({ country: "台灣" })).toEqual(["TW"]);
    expect(buildGeographyKeys({ country: "臺灣" })).toEqual(["TW"]);
  });

  it("returns country + county keys", () => {
    const keys = buildGeographyKeys({ country: "TW", countyCity: "花蓮縣" });
    expect(keys).toEqual(["TW", "TW-HUA"]);
  });

  it("returns country + county + district keys", () => {
    const keys = buildGeographyKeys({
      country: "TW",
      countyCity: "花蓮縣",
      districtTownship: "吉安鄉",
    });
    expect(keys).toEqual(["TW", "TW-HUA", "TW-HUA-吉安"]);
  });

  it("handles all Taiwan counties", () => {
    const keys = buildGeographyKeys({ country: "TW", countyCity: "臺東縣" });
    expect(keys).toEqual(["TW", "TW-TTT"]);

    const keys2 = buildGeographyKeys({ country: "TW", countyCity: "宜蘭縣" });
    expect(keys2).toEqual(["TW", "TW-ILA"]);
  });

  it("stops at county when no district provided", () => {
    const keys = buildGeographyKeys({
      country: "TW",
      countyCity: "花蓮縣",
    });
    expect(keys).toHaveLength(2);
  });
});

describe("granularityFromKey", () => {
  it("returns country for single-part key", () => {
    expect(granularityFromKey("TW")).toBe("country");
  });

  it("returns county for two-part key", () => {
    expect(granularityFromKey("TW-HUA")).toBe("county");
  });

  it("returns district for three-part key", () => {
    expect(granularityFromKey("TW-HUA-吉安")).toBe("district");
  });
});

describe("resolveFactsFromProfiles", () => {
  function makeProfile(
    scope: string,
    scopeKey: string | undefined,
    geographyGranularity: string | undefined,
    facts: Array<{ key: string; value: string }>,
  ) {
    return {
      _id: `profile_${scope}_${scopeKey ?? "none"}`,
      scope,
      scopeKey,
      geographyGranularity,
      status: "active" as const,
      facts: facts.map((f) => ({
        key: f.key,
        value: f.value,
      })),
    };
  }

  it("resolves base facts when no location profiles exist", () => {
    const base = makeProfile("base", undefined, undefined, [
      { key: "tempMin", value: "20" },
    ]);
    const result = resolveFactsFromProfiles([base], [], undefined);
    expect(result).toHaveLength(1);
    expect(result[0].resolvedFrom).toBe("base");
    expect(result[0].value).toBe("20");
  });

  it("walks country -> county -> district hierarchy", () => {
    const base = makeProfile("base", undefined, undefined, [
      { key: "plantingMonths", value: "[3,4,5]" },
      { key: "localNotes", value: '"general"' },
    ]);
    const country = makeProfile("location", "TW", "country", [
      { key: "localNotes", value: '"Taiwan note"' },
    ]);
    const county = makeProfile("location", "TW-HUA", "county", [
      { key: "localNotes", value: '"Hualien note"' },
    ]);
    const district = makeProfile("location", "TW-HUA-吉安", "district", [
      { key: "localNotes", value: '"Jian note"' },
    ]);

    const geoKeys = ["TW", "TW-HUA", "TW-HUA-吉安"];
    const result = resolveFactsFromProfiles(
      [base, country, county, district],
      geoKeys,
      undefined,
    );

    const notesResult = result.find((r) => r.key === "localNotes");
    expect(notesResult?.value).toBe('"Jian note"');
    expect(notesResult?.resolvedFrom).toBe("location");
    expect(notesResult?.scopeKey).toBe("TW-HUA-吉安");

    // plantingMonths should still come from base
    const planting = result.find((r) => r.key === "plantingMonths");
    expect(planting?.resolvedFrom).toBe("base");
  });

  it("farm scope overrides all location scopes", () => {
    const base = makeProfile("base", undefined, undefined, [
      { key: "tempMin", value: "20" },
    ]);
    const county = makeProfile("location", "TW-HUA", "county", [
      { key: "tempMin", value: "22" },
    ]);
    const farm = makeProfile("farm", "farm123", undefined, [
      { key: "tempMin", value: "24" },
    ]);

    const result = resolveFactsFromProfiles(
      [base, county, farm],
      ["TW-HUA"],
      "farm123",
    );

    const temp = result.find((r) => r.key === "tempMin");
    expect(temp?.value).toBe("24");
    expect(temp?.resolvedFrom).toBe("farm");
  });

  it("excludes location profiles not matching geography keys", () => {
    const base = makeProfile("base", undefined, undefined, [
      { key: "tempMin", value: "20" },
    ]);
    const hualien = makeProfile("location", "TW-HUA", "county", [
      { key: "tempMin", value: "22" },
    ]);
    const taitung = makeProfile("location", "TW-TTT", "county", [
      { key: "tempMin", value: "25" },
    ]);

    // Farm is in Hualien, so Taitung profile should not apply
    const result = resolveFactsFromProfiles(
      [base, hualien, taitung],
      ["TW", "TW-HUA"],
      undefined,
    );

    const temp = result.find((r) => r.key === "tempMin");
    expect(temp?.value).toBe("22");
    expect(temp?.scopeKey).toBe("TW-HUA");
  });

  it("filters out inactive profiles", () => {
    const base = makeProfile("base", undefined, undefined, [
      { key: "tempMin", value: "20" },
    ]);
    const archived = {
      ...makeProfile("location", "TW-HUA", "county", [
        { key: "tempMin", value: "99" },
      ]),
      status: "archived" as const,
    };

    const result = resolveFactsFromProfiles(
      [base, archived],
      ["TW-HUA"],
      undefined,
    );
    expect(result.find((r) => r.key === "tempMin")?.value).toBe("20");
  });

  it("county overrides country for same key", () => {
    const country = makeProfile("location", "TW", "country", [
      { key: "localNotes", value: '"country note"' },
    ]);
    const county = makeProfile("location", "TW-HUA", "county", [
      { key: "localNotes", value: '"county note"' },
    ]);

    const result = resolveFactsFromProfiles(
      [country, county],
      ["TW", "TW-HUA"],
      undefined,
    );
    expect(result.find((r) => r.key === "localNotes")?.value).toBe('"county note"');
  });

  it("returns provenance for each resolved fact", () => {
    const base = makeProfile("base", undefined, undefined, [
      { key: "tempMin", value: "20" },
      { key: "water", value: '"moderate"' },
    ]);
    const county = makeProfile("location", "TW-HUA", "county", [
      { key: "tempMin", value: "22" },
    ]);

    const result = resolveFactsFromProfiles(
      [base, county],
      ["TW", "TW-HUA"],
      undefined,
    );

    const temp = result.find((r) => r.key === "tempMin");
    expect(temp?.resolvedFrom).toBe("location");
    expect(temp?.scopeKey).toBe("TW-HUA");
    expect(temp?.profileId).toBe("profile_location_TW-HUA");

    const water = result.find((r) => r.key === "water");
    expect(water?.resolvedFrom).toBe("base");
    expect(water?.scopeKey).toBeUndefined();
  });
});
