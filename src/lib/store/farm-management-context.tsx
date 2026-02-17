"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { HarvestLog, FinanceRecord, SoilNote, WeatherLog } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface FarmManagementContextType {
  harvestLogs: HarvestLog[];
  financeRecords: FinanceRecord[];
  soilNotes: SoilNote[];
  weatherLogs: WeatherLog[];
  isLoaded: boolean;
  addHarvestLog: (log: Omit<HarvestLog, "id">) => void;
  removeHarvestLog: (id: string) => void;
  addFinanceRecord: (record: Omit<FinanceRecord, "id">) => void;
  removeFinanceRecord: (id: string) => void;
  addSoilNote: (note: Omit<SoilNote, "id">) => void;
  removeSoilNote: (id: string) => void;
  addWeatherLog: (log: Omit<WeatherLog, "id">) => void;
  removeWeatherLog: (id: string) => void;
}

const FarmManagementContext = createContext<FarmManagementContextType | null>(null);

export function FarmManagementProvider({ children }: { children: ReactNode }) {
  const [harvestLogs, setHarvestLogs, harvestLoaded] = useLocalStorage<HarvestLog[]>("hualien-harvest-logs", []);
  const [financeRecords, setFinanceRecords, financeLoaded] = useLocalStorage<FinanceRecord[]>("hualien-finance", []);
  const [soilNotes, setSoilNotes, soilLoaded] = useLocalStorage<SoilNote[]>("hualien-soil-notes", []);
  const [weatherLogs, setWeatherLogs, weatherLoaded] = useLocalStorage<WeatherLog[]>("hualien-weather-logs", []);

  const isLoaded = harvestLoaded && financeLoaded && soilLoaded && weatherLoaded;

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
        weatherLogs,
        isLoaded,
        addHarvestLog,
        removeHarvestLog,
        addFinanceRecord,
        removeFinanceRecord,
        addSoilNote,
        removeSoilNote,
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
