/**
 * Shared lifecycle constants used by both the dashboard and the field-editor
 * lifecycle inspector. All labels are in Traditional Chinese (zh-TW).
 */

// --- Lifecycle type labels ---

export const LIFECYCLE_TYPE_LABELS: Record<string, string> = {
  seasonal: "短期季節作物",
  long_cycle: "長期作物",
  perennial: "多年生",
  orchard: "果園",
}

/** Short labels for compact UI (e.g., dashboard cards) */
export const LIFECYCLE_TYPE_SHORT_LABELS: Record<string, string> = {
  seasonal: "季節性",
  long_cycle: "長期",
  perennial: "多年生",
  orchard: "果園",
}

// --- Growth stage labels ---

export const STAGE_LABELS: Record<string, string> = {
  seedling: "幼苗期",
  vegetative: "營養生長期",
  flowering: "開花期",
  fruiting: "結果期",
  harvest_ready: "可採收",
  dormant: "休眠",
  declining: "衰退",
}

// --- Stage color classes (pill badge) ---

export const STAGE_COLORS: Record<string, string> = {
  seedling: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  vegetative:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  flowering:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  fruiting:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  harvest_ready:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  dormant:
    "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400",
  declining:
    "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
}

// --- Stage border accent colors (for card left-border highlight) ---

export const STAGE_BORDER_COLORS: Record<string, string> = {
  seedling: "border-l-lime-400",
  vegetative: "border-l-green-500",
  flowering: "border-l-pink-400",
  fruiting: "border-l-orange-400",
  harvest_ready: "border-l-amber-500",
  dormant: "border-l-slate-400",
  declining: "border-l-red-400",
}

// --- Stage dot colors (small colored dot in segmented bar) ---

export const STAGE_DOT_COLORS: Record<string, string> = {
  seedling: "bg-lime-400",
  vegetative: "bg-green-500",
  flowering: "bg-pink-400",
  fruiting: "bg-orange-400",
  harvest_ready: "bg-amber-500",
  dormant: "bg-slate-400",
  declining: "bg-red-400",
}

// --- Ordered progression stages (for the segmented progress bar) ---
// These are the typical linear stages; dormant/declining are side-branches.

export const PROGRESSION_STAGES = [
  "seedling",
  "vegetative",
  "flowering",
  "fruiting",
  "harvest_ready",
] as const

export type ProgressionStage = (typeof PROGRESSION_STAGES)[number]

// --- Lifecycle type icons (lucide icon names for reference) ---

export const LIFECYCLE_TYPE_ICONS: Record<string, string> = {
  seasonal: "CalendarRange",
  long_cycle: "Timer",
  perennial: "TreePine",
  orchard: "Trees",
}
