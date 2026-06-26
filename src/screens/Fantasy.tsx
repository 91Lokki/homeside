import { useMemo, useState } from 'react'
import { Lock, Plus, X } from 'lucide-react'
import { teamByCode } from '@/data/teams'
import { scorePick, SCORING_RULES, SLOTS, SLOT_LABEL, type Slot } from '@/domain/fantasy'
import { useMatchDetails } from '@/lib/matchData'
import { PlayerPicker } from '@/components/PlayerPicker'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { cn } from '@/lib/utils'

export function Fantasy() {
  const { matches } = useApp()
  const { fantasy, fantasyLocked, setFantasyPick, lockFantasy, resetFantasy } = useGames()
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)

  const pickedTeams = useMemo(() => SLOTS.map((s) => fantasy[s]?.teamCode).filter(Boolean) as string[], [fantasy])
  const koFixtureIds = useMemo(
    () =>
      matches
        .filter((m) => m.stage !== 'group' && m.status === 'finished' && m.apiFixtureId && (pickedTeams.includes(m.homeCode ?? '') || pickedTeams.includes(m.awayCode ?? '')))
        .map((m) => m.apiFixtureId as number),
    [matches, pickedTeams],
  )
  const { details } = useMatchDetails(koFixtureIds)
  const detailList = useMemo(() => Object.values(details), [details])

  const scores = useMemo(() => {
    const out: Partial<Record<Slot, ReturnType<typeof scorePick>>> = {}
    for (const s of SLOTS) {
      const pick = fantasy[s]
      if (!pick) continue
      out[s] = scorePick(
        pick,
        detailList.filter((d) => d.home === pick.teamCode || d.away === pick.teamCode),
      )
    }
    return out
  }, [fantasy, detailList])

  const total = SLOTS.reduce((a, s) => a + (scores[s]?.points ?? 0), 0)
  const picksMade = SLOTS.filter((s) => fantasy[s]).length
  const koPlayed = koFixtureIds.length > 0

  return (
    <div className="animate-fade-in">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Five-player fantasy</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">Your knockout five</h1>
        </div>
        <div className="text-right">
          <p className="font-grotesk text-2xl font-semibold tnum leading-none">{total}</p>
          <p className="text-2xs text-faint">total points</p>
        </div>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Pick one player for each position. They score from their real goals, assists and clean sheets in the knockouts —
        and stop scoring if their team is knocked out. {fantasyLocked ? 'Your five are locked.' : 'Choose carefully: it’s a one-time pick.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SLOTS.map((slot) => {
          const pick = fantasy[slot]
          const sc = scores[slot]
          const team = pick ? teamByCode[pick.teamCode] : null
          return (
            <div key={slot} className="panel flex flex-col p-4">
              <div className="flex items-center justify-between">
                <Label>{SLOT_LABEL[slot]}</Label>
                {sc && <span className="font-grotesk text-sm font-semibold text-team tnum">{sc.points}</span>}
              </div>
              {pick ? (
                <div className="mt-3 flex-1">
                  <p className="font-grotesk text-base font-medium leading-tight">{pick.name}</p>
                  <p className="mt-0.5 text-2xs text-faint">{team?.name ?? pick.teamCode}</p>
                  {sc && sc.matches.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {sc.matches.flatMap((m) => m.lines).map((l, i) => (
                        <li key={i} className="text-2xs text-muted">{l}</li>
                      ))}
                    </ul>
                  )}
                  {!fantasyLocked && (
                    <button onClick={() => setFantasyPick(slot, null)} className="mt-3 inline-flex items-center gap-1 text-2xs text-faint hover:text-ink">
                      <X size={11} /> change
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setOpenSlot(slot)}
                  disabled={fantasyLocked}
                  className="mt-3 flex flex-1 flex-col items-center justify-center gap-1.5 rounded-card border border-dashed py-6 text-faint transition-colors hover:border-ink/30 hover:text-muted disabled:opacity-40"
                >
                  <Plus size={18} />
                  <span className="text-2xs">add {SLOT_LABEL[slot].toLowerCase()}</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!fantasyLocked ? (
          <button
            onClick={lockFantasy}
            disabled={picksMade < 5}
            className={cn(
              'inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors',
              picksMade < 5 ? 'border text-faint' : 'bg-team text-team-ink hover:-translate-y-0.5',
            )}
          >
            <Lock size={14} /> {picksMade < 5 ? `Pick ${5 - picksMade} more to lock in` : 'Lock in your five'}
          </button>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-pill bg-team-soft px-4 py-2 text-sm text-team">
              <Lock size={14} /> Locked {koPlayed ? '· scoring live' : '· scoring starts at the knockouts'}
            </span>
            <button onClick={resetFantasy} className="text-2xs text-faint hover:text-ink">
              reset (start over)
            </button>
          </>
        )}
      </div>

      {fantasyLocked && !koPlayed && (
        <p className="mt-3 text-xs text-muted">No knockout matches have finished yet — points appear here as they’re played.</p>
      )}

      {/* scoring legend */}
      <section className="mt-8">
        <Label>How points work</Label>
        <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {SCORING_RULES.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b py-1.5 text-sm">
              <span className="text-muted">{r.label}</span>
              <span className="font-medium tnum">{r.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-2xs text-faint">
          Scored from real Highlightly box-score events. Player matching is best-effort by team + shirt number/name; any
          unmatched scorer is logged so a zero isn’t silent.
        </p>
      </section>

      {openSlot && (
        <PlayerPicker
          slot={openSlot}
          onClose={() => setOpenSlot(null)}
          onPick={(p) => {
            setFantasyPick(openSlot, p)
            setOpenSlot(null)
          }}
        />
      )}
    </div>
  )
}
