'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Activity } from '@/types'
import { formatDate, formatDistance, formatDuration, sportEmoji } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const SPORTS = ['All', 'Ride', 'VirtualRide', 'Run', 'Walk', 'Other']
const PAGE_SIZE = 25

export function ActivityTable({ activities }: { activities: Activity[] }) {
  const [sport, setSport] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<keyof Activity>('start_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    let list = activities
    if (sport !== 'All') {
      list = sport === 'Other'
        ? list.filter(a => !['Ride', 'VirtualRide', 'Run', 'Walk'].includes(a.sport_type))
        : list.filter(a => a.sport_type === sport)
    }
    if (search) {
      list = list.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()))
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return list
  }, [activities, sport, search, sortKey, sortDir])

  const total = filtered.length
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function toggleSort(key: keyof Activity) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const SortIcon = ({ k }: { k: keyof Activity }) =>
    sortKey === k ? <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span> : null

  if (!activities.length) {
    return <p className="text-muted-foreground text-sm">No activities yet — sync Strava on the Connect page.</p>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search activities…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {SPORTS.map(s => (
            <button
              key={s}
              onClick={() => { setSport(s); setPage(1) }}
              className={`px-3 py-2.5 min-h-[44px] rounded text-xs font-medium transition-colors ${
                sport === s ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-muted-foreground text-xs uppercase tracking-wider">
              {/* Always visible */}
              <th className="text-left px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                onClick={() => toggleSort('start_date')}>Date<SortIcon k="start_date" /></th>
              <th className="text-left px-4 py-3 cursor-pointer hover:text-foreground select-none"
                onClick={() => toggleSort('name')}>Activity<SortIcon k="name" /></th>
              <th className="text-left px-4 py-3 cursor-pointer hover:text-foreground select-none"
                onClick={() => toggleSort('sport_type')}>Type<SortIcon k="sport_type" /></th>
              <th className="text-left px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                onClick={() => toggleSort('tss')}>TSS<SortIcon k="tss" /></th>
              {/* Hidden on mobile */}
              <th className="hidden md:table-cell text-left px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                onClick={() => toggleSort('distance')}>Distance<SortIcon k="distance" /></th>
              <th className="hidden md:table-cell text-left px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                onClick={() => toggleSort('moving_time')}>Duration<SortIcon k="moving_time" /></th>
              <th className="hidden md:table-cell text-left px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                onClick={() => toggleSort('elevation_gain')}>Elevation<SortIcon k="elevation_gain" /></th>
              <th className="hidden md:table-cell text-left px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                onClick={() => toggleSort('weighted_avg_watts')}>Avg Power<SortIcon k="weighted_avg_watts" /></th>
              <th className="hidden md:table-cell text-left px-4 py-3 cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                onClick={() => toggleSort('average_heartrate')}>Avg HR<SortIcon k="average_heartrate" /></th>
            </tr>
          </thead>
          <tbody>
            {paged.map(act => (
              <tr key={act.id} className="border-t border-white/5 hover:bg-secondary/40 transition-colors">
                {/* Always visible */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  <Link href={`/activities/${act.id}`} className="hover:text-primary">{formatDate(act.start_date)}</Link>
                </td>
                <td className="px-4 py-3 max-w-[160px] md:max-w-[200px]">
                  <Link href={`/activities/${act.id}`} className="hover:text-primary transition-colors">
                    <span className="truncate block">{act.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span>{sportEmoji(act.sport_type)}<span className="hidden md:inline"> {act.sport_type}</span></span>
                </td>
                <td className="px-4 py-3 font-medium">
                  {act.tss ? Math.round(act.tss) : '—'}
                </td>
                {/* Hidden on mobile */}
                <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                  {act.distance ? formatDistance(act.distance) : '—'}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                  {act.moving_time ? formatDuration(act.moving_time) : '—'}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                  {act.elevation_gain ? `${Math.round(act.elevation_gain)}m` : '—'}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                  {act.weighted_avg_watts ? `${Math.round(act.weighted_avg_watts)}W` : '—'}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                  {act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} activities</span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-2 min-h-[44px] rounded bg-secondary disabled:opacity-40 hover:bg-secondary/80"
          >← Prev</button>
          <span className="px-2 py-2">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-2 min-h-[44px] rounded bg-secondary disabled:opacity-40 hover:bg-secondary/80"
          >Next →</button>
        </div>
      </div>
    </div>
  )
}
