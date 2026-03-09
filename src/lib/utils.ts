import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeTaskTitle(title: string) {
  return title.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '').trim()
}
