import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { StravaCard } from '@/components/connect/StravaCard'
import { Skeleton } from '@/components/ui/skeleton'

export default async function ConnectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stravaToken } = await supabase
    .from('strava_tokens')
    .select('athlete_name, athlete_avatar_url, last_synced_at, sync_status, total_activities')
    .eq('user_id', user!.id)
    .single()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Connect</h1>
      <p className="text-muted-foreground mb-6">Link your training accounts to sync data into FitDash.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Suspense fallback={<Skeleton className="h-48" />}>
          <StravaCard
            userId={user!.id}
            connected={!!stravaToken}
            athleteName={stravaToken?.athlete_name}
            avatarUrl={stravaToken?.athlete_avatar_url}
            lastSyncedAt={stravaToken?.last_synced_at}
            syncStatus={stravaToken?.sync_status}
            totalActivities={stravaToken?.total_activities}
          />
        </Suspense>
      </div>
    </div>
  )
}
