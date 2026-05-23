import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ActivityDetail } from '@/components/activities/ActivityDetail'
import { notFound } from 'next/navigation'

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = await createServiceClient()

  const [actRes, streamRes] = await Promise.all([
    service.from('activities').select('*').eq('id', id).eq('user_id', user.id).single(),
    service.from('activity_streams').select('*').eq('activity_id', id).maybeSingle(),
  ])

  if (!actRes.data) notFound()

  return <ActivityDetail activity={actRes.data as any} streams={streamRes.data as any} />
}
