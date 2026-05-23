'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

const ZONE_COLORS = ['#6B7280', '#22C55E', '#F59E0B', '#F97316', '#EF4444']
const ZONE_LABELS = ['Z1 Recovery', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Threshold', 'Z5 VO2Max']

interface HRZoneChartProps {
  zones: { z1: number; z2: number; z3: number; z4: number; z5: number }
}

export function HRZoneChart({ zones }: HRZoneChartProps) {
  const total = Object.values(zones).reduce((a, b) => a + b, 0) || 1
  const data = ['z1', 'z2', 'z3', 'z4', 'z5'].map((z, i) => ({
    zone: ZONE_LABELS[i],
    pct: Math.round((zones[z as keyof typeof zones] / total) * 100),
  }))

  return (
    <div>
      <h2 className="font-semibold mb-4">HR Zone Distribution <span className="text-xs text-muted-foreground font-normal">(last 30 days)</span></h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 48, left: 8, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="zone"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1C1E26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            formatter={(v: unknown) => [`${v}%`]}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v: unknown) => `${v}%`}
              style={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            {data.map((_, i) => (
              <Cell key={i} fill={ZONE_COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
