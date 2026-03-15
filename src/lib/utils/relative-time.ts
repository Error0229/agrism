/**
 * Format a timestamp into a zh-TW relative time string.
 *
 * Rules:
 * - < 1 min: "剛才"
 * - < 1 hour: "X 分鐘前"
 * - < 24 hours: "X 小時前"
 * - < 48 hours: "昨天"
 * - < 7 days: "X 天前"
 * - older: "MM/DD"
 */
export function formatRelativeTime(timestamp: number, now?: number): string {
  const current = now ?? Date.now();
  const diffMs = current - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "剛才";
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) return `${diffHour} 小時前`;
  if (diffDay < 2) return "昨天";
  if (diffDay < 7) return `${diffDay} 天前`;

  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}
