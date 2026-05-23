import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if already syncing
  const { data: token } = await supabase
    .from('strava_tokens')
    .select('sync_status')
    .eq('user_id', userId)
    .single()

  if (token?.sync_status === 'syncing') {
    return NextResponse.json({ error: 'Sync already in progress' }, { status: 409 })
  }

  // Forward to worker if configured
  if (process.env.WORKER_URL && process.env.WORKER_SECRET) {
    try {
      await fetch(`${process.env.WORKER_URL}/sync/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_sync: false }),
      })
    } catch {
      return NextResponse.json({ error: 'Worker unreachable' }, { status: 502 })
    }
  }

  return NextResponse.json({ status: 'started' })
}
