const STORAGE_VERSION = 1;
const VERSION_KEY = "hualien-planting-guide-version";

export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

export function initStorage(): void {
  if (typeof window === "undefined") return;
  const version = window.localStorage.getItem(VERSION_KEY);
  if (!version || parseInt(version) < STORAGE_VERSION) {
    window.localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}
