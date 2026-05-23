'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'

const SPORT_COLORS: Record<string, string> = {
  Ride: '#FC4C02',
  VirtualRide: '#F97316',
  Run: '#3B82F6',
  Other: '#6B7280',
}

interface WeeklyLoadChartProps {
  data: Record<string, number | string>[]
  weeklyTarget: number
}

export function WeeklyLoadChart({ data, weeklyTarget }: WeeklyLoadChartProps) {
  const sports = ['Ride', 'VirtualRide', 'Run', 'Other']
  const [chartHeight, setChartHeight] = useState(280)

  useEffect(() => {
    const check = () => setChartHeight(window.innerWidth < 768 ? 240 : 280)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div>
      <h2 className="font-semibold mb-4">Weekly Load (TSS)</h2>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1C1E26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#9CA3AF', fontSize: 12 }}
            itemStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {weeklyTarget > 0 && (
            <ReferenceLine
              y={weeklyTarget}
              stroke="rgba(250,250,250,0.4)"
              strokeDasharray="4 4"
              label={{ value: `Target ${weeklyTarget}`, fill: '#9CA3AF', fontSize: 11 }}
            />
          )}
          {sports.map(sport => (
            <Bar key={sport} dataKey={sport} stackId="a" fill={SPORT_COLORS[sport]} radius={sport === 'Other' ? [4, 4, 0, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
