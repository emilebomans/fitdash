import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { RecentActivities } from '@/components/dashboard/RecentActivities'
import { FitnessChart } from '@/components/charts/FitnessChart'
import { WeeklyLoadChart } from '@/components/charts/WeeklyLoadChart'
import { PowerCurveChart } from '@/components/charts/PowerCurveChart'
import { HRZoneChart } from '@/components/charts/HRZoneChart'
import { getMetricDeltas, weeklyTSS, powerCurveBests } from '@/lib/metrics'
import { tsbColor } from '@/lib/utils'
import { subDays } from 'date-fns'

export const revalidate = 60 // revalidate every 60s

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Parallel data fetching
  const [metricsRes, activitiesRes, profileRes, streamsRes] = await Promise.all([
    supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true }),
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      .limit(200),
    supabase
      .from('profiles')
      .select('ftp, max_hr, lthr, weekly_tss_target')
      .eq('id', user.id)
      .single(),
    supabase
      .from('activity_streams')
      .select('watts_arr, heartrate_arr, time_arr')
      .eq('user_id', user.id),
  ])

  const metrics = metricsRes.data ?? []
  const activities = activitiesRes.data ?? []
  const profile = profileRes.data ?? { ftp: 200, max_hr: 190, lthr: 170, weekly_tss_target: 500 }
  const streams = streamsRes.data ?? []

  // No data yet — show empty state
  const hasData = metrics.length > 0

  // Current fitness values
  const latest = metrics[metrics.length - 1]
  const deltas = getMetricDeltas(metrics, 7)

  // Weekly TSS last 7 days vs prior 7 days
  const tss7d = activities
    .filter(a => new Date(a.start_date) >= subDays(new Date(), 7))
    .reduce((s, a) => s + (a.tss ?? 0), 0)
  const tss14d = activities
    .filter(a => new Date(a.start_date) >= subDays(new Date(), 14) && new Date(a.start_date) < subDays(new Date(), 7))
    .reduce((s, a) => s + (a.tss ?? 0), 0)
  const tssDelta = Math.round(tss7d - tss14d)

  // Weekly load chart data
  const weeklyData = weeklyTSS(activities as any, 16)

  // Power curve (all cycling streams)
  const cyclingStreams = streams.filter(s => s.watts_arr?.length)
  const powerCurve = powerCurveBests(cyclingStreams as any)

  // HR zones (last 30 days)
  const cutoff = subDays(new Date(), 30)
  const recentActIds = activities
    .filter(a => new Date(a.start_date) >= cutoff)
    .map(a => a.id)

  const recentStreams = streams.filter((s: any) =>
    recentActIds.includes(s.activity_id)
  )

  // Compute HR zones from streams
  const maxHr = profile.max_hr || 190
  const thresholds = [0.6, 0.7, 0.8, 0.9].map(p => p * maxHr)
  const hrZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  for (const stream of recentStreams as any[]) {
    const hr = stream.heartrate_arr ?? []
    const t = stream.time_arr ?? []
    for (let i = 0; i < hr.length; i++) {
      const dt = i > 0 ? t[i] - t[i - 1] : 1
      const bpm = hr[i]
      if (bpm < thresholds[0]) hrZones.z1 += dt
      else if (bpm < thresholds[1]) hrZones.z2 += dt
      else if (bpm < thresholds[2]) hrZones.z3 += dt
      else if (bpm < thresholds[3]) hrZones.z4 += dt
      else hrZones.z5 += dt
    }
  }

  const hasCyclingData = cyclingStreams.length > 0

  return (
    <div className="space-y-6">
      {/* No data banner */}
      {!hasData && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-primary">
          Syncing your activities… Check back in a few minutes. You can monitor progress on the{' '}
          <Link href="/connect" className="underline font-medium">Connect page</Link>.
        </div>
      )}

      {/* Section 1: Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="CTL — Fitness"
          value={latest ? latest.ctl.toFixed(1) : '—'}
          delta={deltas.ctlDelta}
          deltaLabel="this week"
        />
        <StatCard
          label="ATL — Fatigue"
          value={latest ? latest.atl.toFixed(1) : '—'}
          delta={deltas.atlDelta}
          deltaLabel="this week"
        />
        <StatCard
          label="TSB — Form"
          value={latest ? latest.tsb.toFixed(1) : '—'}
          delta={deltas.tsbDelta}
          deltaLabel="this week"
          valueClassName={latest ? tsbColor(latest.tsb) : ''}
        />
        <StatCard
          label="Weekly TSS"
          value={Math.round(tss7d)}
          delta={tssDelta}
          deltaLabel="vs prior week"
        />
      </div>

      {/* Section 2: Fitness chart */}
      <Card>
        <CardContent className="pt-6">
          {hasData
            ? <FitnessChart metrics={metrics as any} />
            : <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">Waiting for sync data…</div>
          }
        </CardContent>
      </Card>

      {/* Section 3: Weekly load */}
      <Card>
        <CardContent className="pt-6">
          {weeklyData.length > 0
            ? <WeeklyLoadChart data={weeklyData} weeklyTarget={profile.weekly_tss_target ?? 500} />
            : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Waiting for sync data…</div>
          }
        </CardContent>
      </Card>

      {/* Section 4: Power curve + HR zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasCyclingData && (
          <Card>
            <CardContent className="pt-6">
              <PowerCurveChart allTime={powerCurve} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <HRZoneChart zones={hrZones} />
          </CardContent>
        </Card>
      </div>

      {/* Section 5: Recent activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent Activities</CardTitle>
          <Link href="/activities" className="text-xs text-primary hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          <RecentActivities activities={(activities.slice(0, 10)) as any} />
        </CardContent>
      </Card>
    </div>
  )
}
