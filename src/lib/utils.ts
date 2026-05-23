import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format seconds → "1h 32m" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

/** Format meters → "45.2 km" */
export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`
}

/** Format m/s → "35.2 km/h" */
export function formatSpeed(ms: number): string {
  return `${(ms * 3.6).toFixed(1)} km/h`
}

/** Format date string → "Mon Jan 6" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

/** Sport type → emoji */
export function sportEmoji(sport: string): string {
  const map: Record<string, string> = {
    Ride: '🚴', VirtualRide: '🖥️', Run: '🏃',
    Swim: '🏊', Walk: '🚶', Hike: '🥾',
    WeightTraining: '🏋️', Yoga: '🧘',
  }
  return map[sport] ?? '🏅'
}

/** Delta badge color */
export function deltaColor(delta: number): string {
  if (delta > 0) return 'text-green-400'
  if (delta < 0) return 'text-red-400'
  return 'text-muted-foreground'
}

/** TSB form color */
export function tsbColor(tsb: number): string {
  if (tsb > 5) return 'text-green-400'
  if (tsb < -10) return 'text-red-400'
  return 'text-yellow-400'
}
