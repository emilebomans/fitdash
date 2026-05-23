export interface Profile {
  id: string
  email: string
  display_name: string
  ftp: number
  max_hr: number
  lthr: number
  weekly_tss_target: number
}

export interface StravaToken {
  user_id: string
  athlete_name: string
  athlete_avatar_url: string
  last_synced_at: string
  sync_status: 'idle' | 'syncing' | 'error'
  sync_error: string | null
  total_activities: number
}

export interface Activity {
  id: number
  user_id: string
  strava_id: number
  name: string
  sport_type: string
  start_date: string
  elapsed_time: number
  moving_time: number
  distance: number
  elevation_gain: number
  average_heartrate: number | null
  max_heartrate: number | null
  average_watts: number | null
  weighted_avg_watts: number | null
  max_watts: number | null
  average_speed: number
  tss: number | null
  intensity_factor: number | null
  kudos_count: number
  description: string | null
  trainer: boolean
  commute: boolean
}

export interface DailyMetric {
  id: number
  user_id: string
  date: string
  ctl: number
  atl: number
  tsb: number
  tss_day: number
}

export interface ActivityStream {
  id: number
  activity_id: number
  user_id: string
  time_arr: number[] | null
  watts_arr: number[] | null
  heartrate_arr: number[] | null
  cadence_arr: number[] | null
  speed_arr: number[] | null
  altitude_arr: number[] | null
}

export interface ChatMessage {
  id: number
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
