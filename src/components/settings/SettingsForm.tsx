'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Profile } from '@/types'

export function SettingsForm({ profile, userEmail }: { profile: Profile; userEmail: string }) {
  const [values, setValues] = useState({
    display_name: profile?.display_name ?? '',
    ftp: profile?.ftp ?? 200,
    max_hr: profile?.max_hr ?? 190,
    lthr: profile?.lthr ?? 170,
    weekly_tss_target: profile?.weekly_tss_target ?? 500,
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update(values).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function update(key: string, val: string | number) {
    setValues(v => ({ ...v, [key]: val }))
    setSaved(false)
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input
              value={values.display_name}
              onChange={e => update('display_name', e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={userEmail} disabled className="opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Training zones */}
      <Card>
        <CardHeader><CardTitle className="text-base">Training Zones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'ftp', label: 'FTP (watts)', help: 'Used to calculate cycling TSS. Update after each FTP test.', min: 100, max: 500 },
            { key: 'max_hr', label: 'Max Heart Rate (bpm)', help: 'Used to determine HR training zones.', min: 120, max: 230 },
            { key: 'lthr', label: 'Lactate Threshold HR (bpm)', help: 'Used to calculate running hrTSS.', min: 100, max: 220 },
            { key: 'weekly_tss_target', label: 'Weekly TSS Target', help: 'Shown as a reference line on the weekly load chart.', min: 0, max: 2000 },
          ].map(({ key, label, help, min, max }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                type="number"
                min={min}
                max={max}
                value={values[key as keyof typeof values]}
                onChange={e => update(key, Number(e.target.value))}
                onBlur={handleBlur}
              />
              <p className="text-xs text-muted-foreground">{help}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save status */}
      <div className="h-6 text-sm text-right">
        {saving && <span className="text-muted-foreground">Saving…</span>}
        {saved && <span className="text-green-400">Saved ✓</span>}
      </div>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Separator className="bg-destructive/20" />
          <p className="text-sm text-muted-foreground">
            Deleting your data is permanent and cannot be undone.
          </p>
          <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled>
            Delete all my data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
