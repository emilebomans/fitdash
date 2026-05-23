'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, ActivityStream } from '@/types'
import { formatDate, formatDistance, formatDuration, sportEmoji } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-white/5 rounded-2xl px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = Math.ceil(arr.length / maxPoints)
  return arr.filter((_, i) => i % step === 0)
}

export function ActivityDetail({ activity, streams }: { activity: Activity; streams: ActivityStream | null }) {
  const [chartHeight, setChartHeight] = useState(320)

  useEffect(() => {
    const check = () => setChartHeight(window.innerWidth < 768 ? 220 : 320)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Build chart data from streams
  const chartData = (() => {
    if (!streams?.time_arr?.length) return []
    const times = streams.time_arr
    const watts = streams.watts_arr
    const hr = streams.heartrate_arr
    const hasWatts = watts && watts.some(v => v > 0)
    const hasHr = hr && hr.some(v => v > 0)
    if (!hasWatts && !hasHr) return []

    const raw = times.map((t, i) => ({
      time: Math.round(t / 60), // convert seconds → minutes
      watts: hasWatts ? (watts[i] ?? null) : undefined,
      hr: hasHr ? (hr[i] ?? null) : undefined,
    }))
    return downsample(raw, 600)
  })()

  const hasChart = chartData.length > 0
  const hasWatts = chartData.some(d => d.watts != null)
  const hasHr = chartData.some(d => d.hr != null)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link href="/activities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
        <ArrowLeft className="w-4 h-4" /> Back to activities
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <span>{sportEmoji(activity.sport_type)} {activity.sport_type}</span>
          <span>·</span>
          <span>{formatDate(activity.start_date)}</span>
          {activity.trainer && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">Indoor</span>}
        </div>
        <h1 className="text-2xl font-bold">{activity.name}</h1>
        {activity.description && (
          <p className="text-muted-foreground text-sm mt-2">{activity.description}</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activity.distance > 0 && (
          <StatBox label="Distance" value={formatDistance(activity.distance)} />
        )}
        <StatBox label="Duration" value={formatDuration(activity.moving_time)} />
        {activity.elevation_gain != null && activity.elevation_gain > 0 && (
          <StatBox label="Elevation" value={`${Math.round(activity.elevation_gain)}m`} />
        )}
        {activity.tss != null && (
          <StatBox label="TSS" value={String(Math.round(activity.tss))} />
        )}
        {activity.weighted_avg_watts != null && (
          <StatBox label="Avg Power (NP)" value={`${Math.round(activity.weighted_avg_watts)}W`} />
        )}
        {activity.average_heartrate != null && (
          <StatBox label="Avg HR" value={`${Math.round(activity.average_heartrate)} bpm`} />
        )}
        {activity.intensity_factor != null && activity.intensity_factor > 0 && (
          <StatBox label="Intensity Factor" value={activity.intensity_factor.toFixed(2)} />
        )}
        {activity.max_heartrate != null && (
          <StatBox label="Max HR" value={`${activity.max_heartrate} bpm`} />
        )}
      </div>

      {/* Stream chart */}
      {hasChart ? (
        <div className="bg-card border border-white/5 rounded-2xl p-4">
          <h2 className="font-semibold mb-4 text-sm">
            {hasWatts && hasHr ? 'Power & Heart Rate' : hasWatts ? 'Power' : 'Heart Rate'}
          </h2>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                tickFormatter={v => `${v}m`}
              />
              {hasWatts && (
                <YAxis
                  yAxisId="watts"
                  orientation="left"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  unit="W"
                />
              )}
              {hasHr && (
                <YAxis
                  yAxisId="hr"
                  orientation="right"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  unit=" bpm"
                />
              )}
              <Tooltip
                contentStyle={{ background: '#1C1F26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelFormatter={v => `${v} min`}
                formatter={(value: unknown, name: unknown) => [
                  name === 'watts' ? `${value}W` : `${value} bpm`,
                  name === 'watts' ? 'Power' : 'HR',
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
              {hasWatts && (
                <Line
                  yAxisId="watts"
                  type="monotone"
                  dataKey="watts"
                  stroke="#FC4C02"
                  strokeWidth={1.5}
                  dot={false}
                  name="watts"
                  connectNulls
                />
              )}
              {hasHr && (
                <Line
                  yAxisId="hr"
                  type="monotone"
                  dataKey="hr"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  dot={false}
                  name="hr"
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-card border border-white/5 rounded-2xl p-8 text-center text-muted-foreground text-sm">
          No power or HR stream data available for this activity.
        </div>
      )}
    </div>
  )
}
