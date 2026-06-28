import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, GitFork, Users } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { TEAMS } from '@/data/teams'
import { resolveBracket } from '@/domain/bracket'
import { scorePredictions } from '@/domain/predict'
import { currentRound } from '@/domain/fantasyRounds'
import { moodFor } from '@/domain/mood'
import { Mascot } from '@/components/mascot/Mascot'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { DATA_META } from '@/data/meta'
import { useT } from '@/lib/useT'

export function Home() {
  const { homeTeam, matches } = useApp()
  const { predictions, fantasy } = useGames()
  const t = useT()

  const resolved = useMemo(() => resolveBracket(BRACKET, TEAMS, matches), [matches])
  const predScore = useMemo(() => scorePredictions(predictions, resolved), [predictions, resolved])
  const picksMade = fantasy[currentRound()]?.players.length ?? 0

  return (
    <div className="animate-fade-in">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Label>{t.homeLabel}</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight sm:text-4xl">{t.homeTitle}</h1>
          <p className="mt-2 max-w-md text-muted">{t.homeDesc}</p>
        </div>
        {homeTeam && (
          <Link to="/team" className="hidden shrink-0 sm:block" title={`${homeTeam.name} — ability card`}>
            <Mascot code={homeTeam.code} color={homeTeam.color} color2={homeTeam.color2} symbol={homeTeam.symbol} mood={moodFor(matches, homeTeam.code).mood} size={104} />
          </Link>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <GameCard
          to="/predict"
          icon={<GitFork size={18} />}
          title={t.homePredictTitle}
          how={t.homePredictHow}
          stat={`${predScore.points} pts`}
          sub={t.predictGraded(predScore.correct, predScore.graded)}
        />
        <GameCard
          to="/fantasy"
          icon={<Users size={18} />}
          title={t.homeFantasyTitle}
          how={t.homeFantasyHow}
          stat={`${picksMade}/5 ${t.homeSquadSub}`}
          sub={picksMade === 5 ? t.homeSquadComplete : t.homeBuildFive}
        />
      </div>

      {homeTeam && (
        <Link to="/team" className="panel mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-ink/30">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full font-grotesk text-[10px] font-bold" style={{ background: 'var(--team-pure)', color: 'var(--team-ink)' }}>
              {homeTeam.code}
            </span>
            <div>
              <p className="text-sm font-medium">{t.homeAbilityCard(homeTeam.name)}</p>
              <p className="text-2xs text-faint">{t.homeAbilitySub}</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-faint" />
        </Link>
      )}

      <p className="mt-6 text-2xs text-faint">{t.homeNote(DATA_META.asOf)}</p>
    </div>
  )
}

function GameCard({ to, icon, title, how, stat, sub }: { to: string; icon: React.ReactNode; title: string; how: string; stat: string; sub: string }) {
  return (
    <Link to={to} className="panel group flex flex-col p-5 transition-colors hover:border-ink/30">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-muted">
          {icon}
          <span className="font-grotesk text-lg font-medium text-ink">{title}</span>
        </span>
        <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-2 flex-1 text-sm text-muted">{how}</p>
      <div className="mt-4 flex items-baseline gap-2 border-t pt-3">
        <span className="font-grotesk text-xl font-semibold text-team">{stat}</span>
        <span className="text-2xs text-faint">{sub}</span>
      </div>
    </Link>
  )
}
