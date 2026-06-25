import { useState } from 'react'
import { TEAMS } from '@/data/teams'
import type { Mood } from '@/domain/bond'
import { Mascot } from '@/components/mascot/Mascot'
import { MASCOT_ART } from '@/components/mascot/art'
import { Segmented } from '@/components/ui/Segmented'
import { Label } from '@/components/ui/atoms'

/** Dev gallery: every team's mascot at once, to QA distinctiveness + moods. */
export function Gallery() {
  const [mood, setMood] = useState<Mood>('calm')
  const authored = new Set(Object.keys(MASCOT_ART))

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Mascot gallery · dev</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">
            {authored.size} hand-authored · {TEAMS.length - authored.size} generic
          </h1>
        </div>
        <Segmented
          value={mood}
          onChange={setMood}
          options={[
            { value: 'new', label: 'New' },
            { value: 'happy', label: 'Happy' },
            { value: 'calm', label: 'Calm' },
            { value: 'blue', label: 'Blue' },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {TEAMS.map((t) => (
          <div key={t.code} className="flex flex-col items-center rounded-card border bg-surface p-2">
            <Mascot code={t.code} color={t.color} color2={t.color2} symbol={t.symbol} mood={mood} level={4} size={120} animate={false} />
            <p className="mt-1 truncate text-xs font-medium">{t.name}</p>
            <p className="text-2xs text-faint">
              {t.code}
              {authored.has(t.code) ? ' · ✎' : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
