'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const DURATION_LABELS: Record<number, string> = {
  5: '5s', 10: '10s', 30: '30s', 60: '1m',
  120: '2m', 300: '5m', 600: '10m', 1200: '20m', 3600: '1h',
}

interface PowerCurveChartProps {
  allTime: Record<number, number>
}

export function PowerCurveChart({ allTime }: PowerCurveChartProps) {
  const durations = [5, 10, 30, 60, 120, 300, 600, 1200, 3600]
  const data = durations.map(d => ({
    label: DURATION_LABELS[d],
    'All-time': allTime[d] || null,
  }))

  return (
    <div>
      <h2 className="font-semibold mb-4">Power Curve</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={v => `${v}W`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1C1E26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#9CA3AF', fontSize: 12 }}
            formatter={(v: unknown) => [`${Math.round(Number(v))} W`]}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="All-time"
            stroke="#FC4C02"
            strokeWidth={2}
            dot={{ r: 3, fill: '#FC4C02' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
