"use client";

import { useState, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as T;
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    return initialValue;
  });
  const isLoaded = typeof window !== "undefined";

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
          console.error(`Error setting localStorage key "${key}":`, error);
        }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue, isLoaded] as const;
}
