# Homeside · a calm 2026 World Cup companion

Pick one national team as your **home team** and the app becomes its cozy home
base — centered on a little **mascot you bond with** as the team plays its real
matches. Not a stats dashboard; a quiet companion for the summer.

- **Home base** — your team's original mascot front and centre, with bond level,
  the real W/D/L record, the star player, and squad members that unlock as the
  bond grows.
- **Schedule** — all 12 groups (A–L) with standings and fixtures in your local
  time, real final scores, and a light report (goals, possession, shots) for
  finished games.
- **Knockout bracket** — the 32-team bracket (R32 → Final) using the official
  FIFA pairing rules, with your team's path highlighted.

### Principles (enforced in the code, not just the copy)

- Growth is driven **only by real, finished match results** — see
  [`src/domain/bond.ts`](src/domain/bond.ts). A win grows the bond most, a draw a
  little less, and even a loss nudges it forward (you kept the mascot company).
  **It is never punished.**
- **No manual engagement** — there is no cheer button, no feeding, no check-in.
  Nothing in the UI can push progress; it only ever reflects real matches.
- **No simulation** — no win-probability, no "what if". With no API key the
  mascot simply holds at its real current state rather than advancing on
  fabricated data.
- The mascots are **original** (seeded generative SVG), not the official 2026
  mascots or any existing IP.

## Stack

Vite + React 18 + TypeScript + Tailwind. A thin **Vercel Edge** proxy in
[`/api`](api) keeps the API-Football key server-side. The mascot and ambient
field are seeded generative art (no heavy dependencies).

## Local development

```bash
npm install
npm run dev          # http://localhost:5173  (runs on the seed snapshot)
```

To exercise the **real-results** path locally, run the proxy with the Vercel CLI
in a second terminal (it reads your key from `.env`) — the Vite dev server
proxies `/api` to it. Results are fetched on load and refreshed every few hours
(low-frequency; there is no in-match live polling):

```bash
cp .env.example .env # then fill in API_FOOTBALL_KEY
vercel dev           # serves /api on :3000
```

Without a key, every `/api` route returns a "no data" signal and the app stays
on the committed real snapshot.

## Deploying to Vercel

1. Import the repo into Vercel (framework preset: **Vite**).
2. Add environment variables (Project → Settings → Environment Variables):

   | Variable | Value |
   | --- | --- |
   | `API_FOOTBALL_KEY` | your API-Football key |
   | `API_FOOTBALL_HOST` | `v3.football.api-sports.io` (or the RapidAPI host) |
   | `WC_LEAGUE_ID` | `1` |
   | `WC_SEASON` | `2026` |

3. Deploy. The serverless functions in `/api` are detected automatically and the
   SPA rewrite in [`vercel.json`](vercel.json) handles client routing.

> These variables are **server-side only** — never prefix them with `VITE_`, which
> would inline them into the browser bundle.

## The data snapshot

`src/data/*` is generated from a cross-verified research snapshot of the real
2026 World Cup (the draw + all results as of `2026-06-25`, the FIFA bracket
wiring, squads, and team colours/symbols). To regenerate after refreshing
`.research/`:

```bash
node scripts/build-seed.mjs
```

## Project structure

```
api/            Vercel Edge proxy (key stays here): fixtures, standings, match, squad
src/
  data/         generated seed snapshot (teams, fixtures, bracket, squads, meta)
  domain/       pure logic: types, record/standings, results-only bond, bracket resolver
  state/        theme (team colour + dark mode) and the low-frequency results store
  components/   mascot (seeded SVG), ambient field, onboarding, match report, atoms
  screens/      home base · schedule · bracket
scripts/        build-seed.mjs (research -> typed data)
docs/           the ambiance design note
```

Homeside is an unofficial fan project with original mascots; it is not affiliated
with FIFA.
