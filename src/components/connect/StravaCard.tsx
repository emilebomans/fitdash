'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface StravaCardProps {
  userId: string
  connected: boolean
  athleteName?: string
  avatarUrl?: string
  lastSyncedAt?: string
  syncStatus?: string
  totalActivities?: number
}

export function StravaCard({
  userId,
  connected,
  athleteName,
  avatarUrl,
  lastSyncedAt,
  syncStatus,
  totalActivities,
}: StravaCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [syncing, setSyncing] = useState(syncStatus === 'syncing')
  const [disconnecting, setDisconnecting] = useState(false)

  const success = searchParams.get('success')
  const error = searchParams.get('error')

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch(`/api/sync/${userId}`, { method: 'POST' })
      setTimeout(() => {
        setSyncing(false)
        router.refresh()
      }, 2000)
    } catch {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Strava? Your synced activities will remain in FitDash.')) return
    setDisconnecting(true)
    const supabase = createClient()
    await supabase.from('strava_tokens').delete().eq('user_id', userId)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Strava logo */}
            <div className="w-9 h-9 rounded-lg bg-[#FC4C02] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <CardTitle className="text-base">Strava</CardTitle>
          </div>
          {connected
            ? <Badge variant="success">Connected</Badge>
            : <Badge variant="outline">Not connected</Badge>
          }
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Success / error banners */}
        {success && (
          <p className="text-sm text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
            Strava connected! Your activities are syncing in the background.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
            {error === 'strava_denied' ? 'You denied access to Strava.' : 'Something went wrong. Please try again.'}
          </p>
        )}

        {connected ? (
          <>
            {/* Athlete info */}
            <div className="flex items-center gap-3">
              {avatarUrl
                ? <img src={avatarUrl} alt={athleteName} className="w-10 h-10 rounded-full object-cover" />
                : <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">{athleteName?.[0] ?? 'A'}</div>
              }
              <div>
                <p className="font-medium text-sm">{athleteName}</p>
                <p className="text-xs text-muted-foreground">
                  {totalActivities ?? 0} activities synced
                  {lastSyncedAt && ` · Last sync ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`}
                </p>
              </div>
            </div>

            {/* Sync progress */}
            {syncing && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Syncing activities…</p>
                <Progress value={undefined} className="animate-pulse" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-1.5 text-destructive hover:text-destructive"
              >
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Strava account to sync all your rides and runs into FitDash.
            </p>
            <Button asChild className="w-full bg-[#FC4C02] hover:bg-[#FC4C02]/90">
              <a href="/api/strava/authorize">Connect Strava</a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
