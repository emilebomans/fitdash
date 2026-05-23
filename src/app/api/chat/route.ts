import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { groq, buildSystemPrompt } from '@/lib/claude'
import { subDays } from 'date-fns'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages } = await request.json()

  // Fetch context using service client
  const service = await createServiceClient()

  const [profileRes, metricsRes, activitiesRes] = await Promise.all([
    service.from('profiles').select('*').eq('id', user.id).single(),
    service.from('daily_metrics').select('ctl,atl,tsb,tss_day').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
    service.from('activities').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(20),
  ])

  const profile = profileRes.data ?? { display_name: 'Athlete', ftp: 200, max_hr: 190, lthr: 170 }
  const latest = metricsRes.data?.[0] ?? { ctl: 0, atl: 0, tsb: 0, tss_day: 0 }
  const activities = activitiesRes.data ?? []

  // Weekly TSS
  const tss7d = activities
    .filter(a => new Date(a.start_date) >= subDays(new Date(), 7))
    .reduce((s: number, a: any) => s + (a.tss ?? 0), 0)
  const tss28d = activities
    .filter(a => new Date(a.start_date) >= subDays(new Date(), 28))
    .reduce((s: number, a: any) => s + (a.tss ?? 0), 0)

  const systemPrompt = buildSystemPrompt({
    displayName: profile.display_name ?? 'Athlete',
    ftp: profile.ftp ?? 200,
    maxHr: profile.max_hr ?? 190,
    ctl: latest.ctl,
    atl: latest.atl,
    tsb: latest.tsb,
    tss7d,
    tss28d,
    recentActivities: activities,
    weeklyTSS: [],
  })

  // Save user message
  const userMsg = messages[messages.length - 1]
  await service.from('chat_messages').insert({
    user_id: user.id,
    role: 'user',
    content: userMsg.content,
  })

  // Stream Groq response (llama-3.3-70b-versatile — free tier)
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
  })

  // Return SSE stream
  const encoder = new TextEncoder()
  let fullResponse = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            fullResponse += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

        // Save assistant response
        await service.from('chat_messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: fullResponse,
        })
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
