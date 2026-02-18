export interface TimelinePruneConfig {
  maxDays: number;
  keepBeforeActive: number;
  keepAfterActive: number;
}

export interface TimelinePruneResult {
  days: string[];
  trimmedLeft: number;
}

export const defaultTimelinePruneConfig: TimelinePruneConfig = {
  maxDays: 2400,
  keepBeforeActive: 900,
  keepAfterActive: 900,
};

export function pruneTimelineDays(days: string[], activeDate: string, config: TimelinePruneConfig = defaultTimelinePruneConfig): TimelinePruneResult {
  if (days.length <= config.maxDays) {
    return { days, trimmedLeft: 0 };
  }

  const activeIndex = days.indexOf(activeDate);
  const fallbackIndex = Math.floor(days.length / 2);
  const centerIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
  const initialStart = Math.max(0, centerIndex - config.keepBeforeActive);
  const initialEnd = Math.min(days.length, centerIndex + config.keepAfterActive + 1);

  let start = initialStart;
  let end = initialEnd;
  let windowSize = end - start;

  if (windowSize > config.maxDays) {
    const half = Math.floor(config.maxDays / 2);
    start = Math.max(0, centerIndex - half);
    end = Math.min(days.length, start + config.maxDays);
    if (end - start < config.maxDays) {
      start = Math.max(0, end - config.maxDays);
    }
    windowSize = end - start;
  }

  if (windowSize < config.maxDays) {
    const missing = config.maxDays - windowSize;
    const shiftLeft = Math.min(start, Math.ceil(missing / 2));
    start -= shiftLeft;
    end = Math.min(days.length, end + (missing - shiftLeft));
    if (end - start < config.maxDays) {
      start = Math.max(0, end - config.maxDays);
    }
  }

  return {
    days: days.slice(start, end),
    trimmedLeft: start,
  };
}
