import { createClient } from '@/lib/supabase/server'
import { ActivityTable } from '@/components/activities/ActivityTable'

export const revalidate = 60

export default async function ActivitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })
    .limit(500)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Activities</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {activities?.length ?? 0} activities synced
      </p>
      <ActivityTable activities={(activities ?? []) as any} />
    </div>
  )
}
