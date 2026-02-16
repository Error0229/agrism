import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from "date-fns";
import { zhTW } from "date-fns/locale";

export function formatDate(date: string | Date): string {
  return format(new Date(date), "yyyy/MM/dd", { locale: zhTW });
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return "今天";
  if (isTomorrow(d)) return "明天";
  if (isThisWeek(d)) return format(d, "EEEE", { locale: zhTW });
  return formatDistanceToNow(d, { addSuffix: true, locale: zhTW });
}

export function formatMonthDay(date: string | Date): string {
  return format(new Date(date), "M/d", { locale: zhTW });
}

export function getMonthName(month: number): string {
  const monthNames = [
    "一月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月",
  ];
  return monthNames[month - 1];
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
