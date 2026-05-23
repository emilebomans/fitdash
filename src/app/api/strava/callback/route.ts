import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // User denied access on Strava
  if (error || !code || !userId) {
    return NextResponse.redirect(`${appUrl}/connect?error=strava_denied`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Strava token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/connect?error=strava_token`)
  }

  const tokenData = await tokenRes.json()

  const {
    access_token,
    refresh_token,
    expires_at,
    athlete,
  } = tokenData

  // Store tokens in Supabase using service role (bypasses RLS)
  const supabase = await createServiceClient()

  const { error: upsertError } = await supabase
    .from('strava_tokens')
    .upsert({
      user_id: userId,
      access_token,
      refresh_token,
      expires_at,
      athlete_id: athlete?.id,
      athlete_name: `${athlete?.firstname ?? ''} ${athlete?.lastname ?? ''}`.trim(),
      athlete_avatar_url: athlete?.profile_medium ?? athlete?.profile,
      sync_status: 'idle',
      last_synced_at: null,
      total_activities: 0,
    })

  if (upsertError) {
    console.error('Failed to store Strava tokens:', upsertError)
    return NextResponse.redirect(`${appUrl}/connect?error=db`)
  }

  // Trigger initial sync via worker (if configured)
  if (process.env.WORKER_URL && process.env.WORKER_SECRET) {
    try {
      await fetch(`${process.env.WORKER_URL}/sync/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_sync: true }),
      })
    } catch (e) {
      // Worker not yet deployed — safe to ignore during dev
      console.warn('Worker not reachable, skipping initial sync trigger')
    }
  }

  return NextResponse.redirect(`${appUrl}/connect?success=true`)
}
