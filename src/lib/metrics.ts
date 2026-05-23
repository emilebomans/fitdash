import { DailyMetric, Activity } from '@/types'

/** CTL/ATL/TSB deltas vs N days ago */
export function getMetricDeltas(metrics: DailyMetric[], daysAgo: number) {
  if (metrics.length < daysAgo + 1) return { ctlDelta: 0, atlDelta: 0, tsbDelta: 0 }
  const current = metrics[metrics.length - 1]
  const prior = metrics[metrics.length - 1 - daysAgo]
  return {
    ctlDelta: round(current.ctl - prior.ctl, 1),
    atlDelta: round(current.atl - prior.atl, 1),
    tsbDelta: round(current.tsb - prior.tsb, 1),
  }
}

/** Weekly TSS for last N weeks */
export function weeklyTSS(activities: Activity[], weeks = 16) {
  const now = new Date()
  const result: { week: string; tss: number; sport: string }[] = []

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() - w * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const label = `W ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

    const weekActs = activities.filter(a => {
      const d = new Date(a.start_date)
      return d >= weekStart && d < weekEnd
    })

    // Group by sport
    const sports = ['Ride', 'VirtualRide', 'Run', 'Other']
    for (const sport of sports) {
      const tss = weekActs
        .filter(a => sport === 'Other'
          ? !['Ride', 'VirtualRide', 'Run'].includes(a.sport_type)
          : a.sport_type === sport
        )
        .reduce((sum, a) => sum + (a.tss || 0), 0)
      if (tss > 0) result.push({ week: label, tss: round(tss, 0), sport })
    }
  }

  // Pivot: one entry per week with all sports
  const weeks_map: Record<string, Record<string, number>> = {}
  for (const { week, tss, sport } of result) {
    if (!weeks_map[week]) weeks_map[week] = {}
    weeks_map[week][sport] = tss
  }

  return Object.entries(weeks_map).map(([week, sports]) => ({ week, ...sports }))
}

/** Best mean maximal power across activity streams for standard durations */
export function powerCurveBests(
  streams: { watts_arr: number[] | null }[],
  durations = [5, 10, 30, 60, 120, 300, 600, 1200, 3600]
): Record<number, number> {
  const bests: Record<number, number> = {}
  for (const dur of durations) bests[dur] = 0

  for (const stream of streams) {
    if (!stream.watts_arr?.length) continue
    const arr = stream.watts_arr
    for (const dur of durations) {
      if (arr.length < dur) continue
      let windowSum = arr.slice(0, dur).reduce((a, b) => a + b, 0)
      let max = windowSum
      for (let i = dur; i < arr.length; i++) {
        windowSum += arr[i] - arr[i - dur]
        if (windowSum > max) max = windowSum
      }
      const avg = max / dur
      if (avg > bests[dur]) bests[dur] = Math.round(avg * 10) / 10
    }
  }
  return bests
}

function round(n: number, dp: number) {
  return Math.round(n * 10 ** dp) / 10 ** dp
}
