import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/coach/ChatWindow'

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  return <ChatWindow initialMessages={(history ?? []) as any} />
}
