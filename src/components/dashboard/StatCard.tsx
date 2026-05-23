import { Card, CardContent } from '@/components/ui/card'
import { cn, deltaColor } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  valueClassName?: string
}

export function StatCard({ label, value, delta, deltaLabel, valueClassName }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={cn('text-3xl font-bold tabular-nums', valueClassName)}>{value}</p>
        {delta !== undefined && (
          <p className={cn('text-xs mt-1 font-medium', deltaColor(delta))}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'} {Math.abs(delta).toFixed(1)} {deltaLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
