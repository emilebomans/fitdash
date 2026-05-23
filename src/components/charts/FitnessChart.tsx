'use client'

import { useState, useEffect } from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DailyMetric } from '@/types'

const RANGES = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
  { label: '1yr', days: 365 },
  { label: 'All', days: 0 },
]

export function FitnessChart({ metrics }: { metrics: DailyMetric[] }) {
  const [range, setRange] = useState(90)
  const [chartHeight, setChartHeight] = useState(320)

  useEffect(() => {
    const check = () => setChartHeight(window.innerWidth < 768 ? 240 : 320)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const data = range === 0 ? metrics : metrics.slice(-range)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold">Fitness, Fatigue & Form</h2>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={`px-2.5 py-2 min-h-[44px] rounded text-xs font-medium transition-colors ${
                range === r.days ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis yAxisId="left" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1C1E26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}
            labelFormatter={d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            itemStyle={{ fontSize: 12 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v: unknown) => v === 'ctl' ? 'CTL (Fitness)' : v === 'atl' ? 'ATL (Fatigue)' : 'TSB (Form)'}
          />
          <Area yAxisId="right" type="monotone" dataKey="tsb" fill="rgba(34,197,94,0.12)" stroke="#22C55E" strokeWidth={1.5} dot={false} name="tsb" />
          <Line yAxisId="left" type="monotone" dataKey="ctl" stroke="#3B82F6" strokeWidth={2} dot={false} name="ctl" />
          <Line yAxisId="left" type="monotone" dataKey="atl" stroke="#F97316" strokeWidth={2} dot={false} name="atl" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
