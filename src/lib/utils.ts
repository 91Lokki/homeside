import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
