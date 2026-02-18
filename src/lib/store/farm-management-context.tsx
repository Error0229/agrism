"use client";

import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { HarvestLog, FinanceRecord, SoilAmendment, SoilNote, SoilProfile, WeatherLog } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { normalizeSoilAmendment, normalizeSoilProfile } from "@/lib/utils/soil-profile";

interface FarmManagementContextType {
  harvestLogs: HarvestLog[];
  financeRecords: FinanceRecord[];
  soilNotes: SoilNote[];
  soilProfiles: SoilProfile[];
  soilAmendments: SoilAmendment[];
  weatherLogs: WeatherLog[];
  isLoaded: boolean;
  addHarvestLog: (log: Omit<HarvestLog, "id">) => void;
  removeHarvestLog: (id: string) => void;
  addFinanceRecord: (record: Omit<FinanceRecord, "id">) => void;
  removeFinanceRecord: (id: string) => void;
  addSoilNote: (note: Omit<SoilNote, "id">) => void;
  removeSoilNote: (id: string) => void;
  upsertSoilProfile: (profile: Omit<SoilProfile, "updatedAt"> & { updatedAt?: string }) => void;
  removeSoilProfile: (fieldId: string) => void;
  addSoilAmendment: (amendment: Omit<SoilAmendment, "id">) => void;
  removeSoilAmendment: (id: string) => void;
  addWeatherLog: (log: Omit<WeatherLog, "id">) => void;
  removeWeatherLog: (id: string) => void;
}

const FarmManagementContext = createContext<FarmManagementContextType | null>(null);

export function FarmManagementProvider({ children }: { children: ReactNode }) {
  const [harvestLogs, setHarvestLogs, harvestLoaded] = useLocalStorage<HarvestLog[]>("hualien-harvest-logs", []);
  const [financeRecords, setFinanceRecords, financeLoaded] = useLocalStorage<FinanceRecord[]>("hualien-finance", []);
  const [soilNotes, setSoilNotes, soilLoaded] = useLocalStorage<SoilNote[]>("hualien-soil-notes", []);
  const [soilProfilesRaw, setSoilProfiles, soilProfilesLoaded] = useLocalStorage<SoilProfile[]>("hualien-soil-profiles", []);
  const [soilAmendmentsRaw, setSoilAmendments, soilAmendmentsLoaded] = useLocalStorage<SoilAmendment[]>(
    "hualien-soil-amendments",
    []
  );
  const [weatherLogs, setWeatherLogs, weatherLoaded] = useLocalStorage<WeatherLog[]>("hualien-weather-logs", []);

  const isLoaded =
    harvestLoaded && financeLoaded && soilLoaded && soilProfilesLoaded && soilAmendmentsLoaded && weatherLoaded;

  const soilProfiles = useMemo(() => {
    const map = new Map<string, SoilProfile>();
    for (const item of soilProfilesRaw) {
      if (!item?.fieldId) continue;
      map.set(item.fieldId, normalizeSoilProfile(item));
    }
    return Array.from(map.values());
  }, [soilProfilesRaw]);

  const soilAmendments = useMemo(
    () =>
      soilAmendmentsRaw
        .filter((item) => item?.id && item?.fieldId)
        .map((item) => normalizeSoilAmendment(item)),
    [soilAmendmentsRaw]
  );

  const addHarvestLog = useCallback(
    (log: Omit<HarvestLog, "id">) => {
      setHarvestLogs((prev) => [...prev, { ...log, id: uuidv4() }]);
    },
    [setHarvestLogs]
  );

  const removeHarvestLog = useCallback(
    (id: string) => {
      setHarvestLogs((prev) => prev.filter((l) => l.id !== id));
    },
    [setHarvestLogs]
  );

  const addFinanceRecord = useCallback(
    (record: Omit<FinanceRecord, "id">) => {
      setFinanceRecords((prev) => [...prev, { ...record, id: uuidv4() }]);
    },
    [setFinanceRecords]
  );

  const removeFinanceRecord = useCallback(
    (id: string) => {
      setFinanceRecords((prev) => prev.filter((r) => r.id !== id));
    },
    [setFinanceRecords]
  );

  const addSoilNote = useCallback(
    (note: Omit<SoilNote, "id">) => {
      setSoilNotes((prev) => [...prev, { ...note, id: uuidv4() }]);
    },
    [setSoilNotes]
  );

  const removeSoilNote = useCallback(
    (id: string) => {
      setSoilNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [setSoilNotes]
  );

  const upsertSoilProfile = useCallback(
    (profile: Omit<SoilProfile, "updatedAt"> & { updatedAt?: string }) => {
      const normalized = normalizeSoilProfile({ ...profile, updatedAt: profile.updatedAt ?? new Date().toISOString() });
      setSoilProfiles((prev) => {
        const next = prev.filter((item) => item.fieldId !== normalized.fieldId);
        return [...next, normalized];
      });
    },
    [setSoilProfiles]
  );

  const removeSoilProfile = useCallback(
    (fieldId: string) => {
      setSoilProfiles((prev) => prev.filter((item) => item.fieldId !== fieldId));
    },
    [setSoilProfiles]
  );

  const addSoilAmendment = useCallback(
    (amendment: Omit<SoilAmendment, "id">) => {
      const normalized = normalizeSoilAmendment({ ...amendment, id: uuidv4() });
      setSoilAmendments((prev) => [...prev, normalized]);
    },
    [setSoilAmendments]
  );

  const removeSoilAmendment = useCallback(
    (id: string) => {
      setSoilAmendments((prev) => prev.filter((item) => item.id !== id));
    },
    [setSoilAmendments]
  );

  const addWeatherLog = useCallback(
    (log: Omit<WeatherLog, "id">) => {
      setWeatherLogs((prev) => [...prev, { ...log, id: uuidv4() }]);
    },
    [setWeatherLogs]
  );

  const removeWeatherLog = useCallback(
    (id: string) => {
      setWeatherLogs((prev) => prev.filter((l) => l.id !== id));
    },
    [setWeatherLogs]
  );

  return (
    <FarmManagementContext.Provider
      value={{
        harvestLogs,
        financeRecords,
        soilNotes,
        soilProfiles,
        soilAmendments,
        weatherLogs,
        isLoaded,
        addHarvestLog,
        removeHarvestLog,
        addFinanceRecord,
        removeFinanceRecord,
        addSoilNote,
        removeSoilNote,
        upsertSoilProfile,
        removeSoilProfile,
        addSoilAmendment,
        removeSoilAmendment,
        addWeatherLog,
        removeWeatherLog,
      }}
    >
      {children}
    </FarmManagementContext.Provider>
  );
}

export function useFarmManagement() {
  const ctx = useContext(FarmManagementContext);
  if (!ctx) throw new Error("useFarmManagement must be used within FarmManagementProvider");
  return ctx;
}
