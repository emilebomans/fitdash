import Groq from 'groq-sdk'
import { format } from 'date-fns'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export function buildSystemPrompt(context: {
  displayName: string
  ftp: number
  maxHr: number
  ctl: number
  atl: number
  tsb: number
  tss7d: number
  tss28d: number
  recentActivities: any[]
  weeklyTSS: { week: string; tss: number }[]
}) {
  const { displayName, ftp, maxHr, ctl, atl, tsb, tss7d, tss28d, recentActivities, weeklyTSS } = context
  const wkg = ftp ? (ftp / 70).toFixed(2) : 'unknown' // assume 70kg default

  const activitiesText = recentActivities
    .slice(0, 20)
    .map(a => {
      const date = format(new Date(a.start_date), 'MMM d')
      const dist = a.distance ? `${(a.distance / 1000).toFixed(1)}km` : ''
      const dur = a.moving_time ? `${Math.floor(a.moving_time / 3600)}h${Math.floor((a.moving_time % 3600) / 60)}m` : ''
      const watts = a.weighted_avg_watts ? `${Math.round(a.weighted_avg_watts)}W avg` : ''
      const hr = a.average_heartrate ? `${Math.round(a.average_heartrate)}bpm avg` : ''
      return `${date} | ${a.sport_type} | ${a.name} | ${dist} | ${dur} | TSS ${Math.round(a.tss ?? 0)} | ${watts} | ${hr}`
    })
    .join('\n')

  const weeklyText = weeklyTSS
    .slice(-8)
    .reverse()
    .map(w => `Week of ${w.week}: ${Math.round(w.tss)} TSS`)
    .join('\n')

  return `You are FitDash AI Coach, a knowledgeable, direct, and encouraging endurance sports coach.
You have access to the athlete's complete training history. Be specific and data-driven.
Use correct sports science terminology (CTL, ATL, TSB, TSS, FTP, NP, IF, W/kg).
Ground every recommendation in the actual data provided below.
Keep responses concise — use bullet points for workout suggestions.

ATHLETE: ${displayName} | FTP: ${ftp}W | Max HR: ${maxHr}bpm | Today: ${format(new Date(), 'MMM d, yyyy')}

CURRENT FITNESS:
CTL (Fitness): ${ctl.toFixed(1)} | ATL (Fatigue): ${atl.toFixed(1)} | TSB (Form): ${tsb.toFixed(1)}
Last 7d TSS: ${Math.round(tss7d)} | Last 28d TSS: ${Math.round(tss28d)}
W/kg at FTP: ${wkg}

RECENT ACTIVITIES (last 20):
${activitiesText || 'No activities yet'}

WEEKLY TSS (last 8 weeks, newest first):
${weeklyText || 'No data yet'}`
}
