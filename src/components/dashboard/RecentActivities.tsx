import Link from 'next/link'
import { Activity } from '@/types'
import { formatDate, formatDistance, formatDuration, sportEmoji } from '@/lib/utils'

export function RecentActivities({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        No activities yet — connect Strava and run a sync to get started.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left pb-2 pr-4">Date</th>
            <th className="text-left pb-2 pr-4">Activity</th>
            <th className="text-left pb-2 pr-4 hidden sm:table-cell">Distance</th>
            <th className="text-left pb-2 pr-4 hidden sm:table-cell">Duration</th>
            <th className="text-left pb-2 pr-4">TSS</th>
            <th className="text-left pb-2 pr-4 hidden md:table-cell">Avg Power</th>
            <th className="text-left pb-2 hidden md:table-cell">Avg HR</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act) => (
            <tr
              key={act.id}
              className="border-b border-white/5 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                <Link href={`/activities/${act.id}`} className="block">
                  {formatDate(act.start_date)}
                </Link>
              </td>
              <td className="py-3 pr-4 max-w-[180px]">
                <Link href={`/activities/${act.id}`} className="block">
                  <span className="mr-1.5">{sportEmoji(act.sport_type)}</span>
                  <span className="truncate">{act.name?.slice(0, 30)}</span>
                </Link>
              </td>
              <td className="py-3 pr-4 hidden sm:table-cell text-muted-foreground">
                {act.distance ? formatDistance(act.distance) : '—'}
              </td>
              <td className="py-3 pr-4 hidden sm:table-cell text-muted-foreground">
                {act.moving_time ? formatDuration(act.moving_time) : '—'}
              </td>
              <td className="py-3 pr-4 font-medium">
                {act.tss ? Math.round(act.tss) : '—'}
              </td>
              <td className="py-3 pr-4 hidden md:table-cell text-muted-foreground">
                {act.weighted_avg_watts ? `${Math.round(act.weighted_avg_watts)} W` : '—'}
              </td>
              <td className="py-3 hidden md:table-cell text-muted-foreground">
                {act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
