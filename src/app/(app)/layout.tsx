import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email?.split('@')[0]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar displayName={displayName} />
      <Topbar displayName={displayName} />

      {/* Main content — offset for sidebar on desktop, topbar + bottom nav on mobile */}
      <main className="md:ml-60 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
