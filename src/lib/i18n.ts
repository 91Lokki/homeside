import type { Lang } from '@/state/lang'
import type { ApiStatus } from './api'

export interface Translations {
  // ── Nav ──
  navPredict: string
  navFantasy: string
  navTeam: string
  navSchedule: string
  navScheduleShort: string
  navLeague: string

  // ── Footer ──
  footerConnected: string
  footerSnapshot: (asOf: string) => string
  footerNoSim: string
  footerCredit: string

  // ── Home ──
  homeLabel: string
  homeTitle: string
  homeDesc: string
  homePredictTitle: string
  homePredictHow: string
  homeFantasyTitle: string
  homeFantasyHow: string
  homeSquadSub: string
  homeSquadComplete: string
  homeBuildFive: string
  homeAbilityCard: (name: string) => string
  homeAbilitySub: string
  homeNote: (asOf: string) => string

  // ── Predict ──
  predictLabel: string
  predictTitle: string
  predictDesc: string
  predictGraded: (correct: number, total: number) => string
  predictBonusHint: string
  predictScoreBreakdown: (base: number, bonus: number) => string
  predictLockedIn: string
  predictReset: string
  predictConfirmBtn: string
  predictChampion: string
  predictFinal: string
  predictThirdPlace: string
  predictConfirmTitle: string
  predictConfirmDesc: (champion: string | null) => string
  predictCancel: string
  predictLock: string
  predictFullTime: string
  predictTBD: string

  // ── Fantasy ──
  fantasyLabel: string
  fantasyTitle: string
  fantasyTotal: string
  fantasyLive: string
  fantasyTransfersOpen: string
  fantasyBuildFive: string
  fantasyLocked: string
  fantasyMaxCountry: (n: number) => string
  fantasyTransfersUsed: (used: number, free: number | null) => string
  fantasyPaidPts: (pts: number) => string
  fantasyUnlimited: string
  fantasyGoalEnd: string
  fantasyAttackEnd: string
  fantasyHowToScore: string
  fantasyHowSub: string
  fantasyCaptain: string
  fantasyChangePlayer: string
  fantasyRemove: string
  fantasyPickFive: string
  fantasyMakeTransfers: string
  fantasyUnlimitedBuild: string
  fantasyReset: string
  fantasySave: string
  fantasyCancel: string
  fantasyRoundLocked: string
  fantasyPtsOnSave: (pts: number) => string
  fantasyUnlimitedMobile: string
  fantasyRoundLabel: Record<string, string>
  fantasySlotLabel: Record<string, string>
  fantasyPosAbbr: Record<string, string>
  fantasyScoringRules: { label: string; value: string }[]
  fantasyPlayerMatching: string

  // ── Team ──
  teamNationalLabel: (group: string) => string
  teamTopSeed: string
  teamPot: (n: number) => string
  teamHost: string
  teamThrough: string
  teamEliminated: string
  teamBackTo: (name: string) => string
  teamBackToMobile: (name: string) => string
  teamPosLines: [string, string][]
  teamPosName: Record<string, string>
  teamNoSquad: (name: string) => string
  teamPlayersToKnow: string
  teamFullSquad: string
  teamPlayers: (n: number, unconfirmed: boolean) => string
  teamAbilityCard: string
  teamRealStats: (n: number) => string
  teamUpdating: string
  teamProvisional: string
  teamRatings: string
  teamNullAxis: string
  teamNoMatches: string
  teamLive: string
  teamNext: string
  teamRecord: string
  teamForm: string
  teamGoals: string
  teamSquad: string
  teamAbilityNoData: (name: string, status: ApiStatus, healthKnown: boolean) => string
  teamAxisLabel: Record<string, string>

  // ── Schedule ──
  scheduleTitle: string
  scheduleFollowing: (name: string, group: string) => string
  scheduleGroupLabel: (g: string) => string
  scheduleStandings: string
  scheduleTeamCol: string
  scheduleAdvancing: string
  scheduleEliminated: string
  scheduleAdvanceNote: string
  scheduleFixtures: string
  scheduleMatches: (n: number) => string
  scheduleMatchday: (n: number) => string
  scheduleGroupMatch: (n: number) => string
  scheduleLive: string
  scheduleFT: string

  // ── Leaderboard ──
  leagueLabel: string
  leagueTitle: string
  leagueGuestNote: string
  leagueSignIn: string
  leagueLoadError: (msg: string) => string
  leagueLoading: string
  leagueEmpty: string
  leagueHashCol: string
  leaguePlayerCol: string
  leagueYou: string
  leagueScoring: string
  leagueScoringDone: string
  leagueSessionCheck: string

  // ── TeamPicker ──
  pickerLabel: string
  pickerTitle: string
  pickerDesc: string
  pickerSearch: string
  pickerGroup: (g: string) => string
  pickerAllTeams: string
  pickerGroupHero: (group: string) => string
  pickerHeroDesc: (name: string, symbol: string) => string
  pickerBackToHome: string
  pickerBegin: string

  // ── TeamSwitcher ──
  switcherSearch: string
  switcherTitle: string
  switcherHome: string
  switcherNoMatch: string

  // ── PlayerPicker ──
  poolTitle: string
  poolPickSlot: (label: string) => string
  poolFillFlex: string
  poolFillSlot: (label: string) => string
  poolBrowse: string
  poolSearchPlaceholder: string
  poolAll: string
  poolShowAll: string
  poolAddable: (n: number) => string
  poolCountryFull: string
  poolNoMatch: string
  poolBack: string

  // ── MatchReport ──
  reportLoading: string
  reportChecking: string
  reportFinalScore: string
  reportUnavailable: string
  reportTeamStats: string
  reportStatLabels: [string, string, string][]
  reportOG: string
  reportPen: string
  reportGoalFallback: string
  liveDataNote: (status: ApiStatus) => string

  // ── KnockoutProgress ──
  progressChampions: string
  progressRun: string
  progressLive: string
  progressFinal: string
  progressPts: (n: number) => string

  // ── Auth ──
  authSignIn: string
  authSignOut: string
  authAccountTitle: string
  authAccountDesc: string
  authLeagueLabel: string
  authJoinTitle: string
  authJoinDesc: string
  authGoogle: string
  authGuest: string
  authRequireTitle: string
  authRequireDesc: string

  // ── ErrorBoundary ──
  errorTitle: string
  errorDesc: string
  errorReload: string

  // ── ThemeToggle ──
  themeToLight: string
  themeToDark: string

  // ── atoms ──
  atomFormLabel: string
  atomNotPlayed: string
  atomVs: string

  // ── LangToggle ──
  langToggleLabel: string
}

const en: Translations = {
  // Nav
  navPredict: 'Predict',
  navFantasy: 'Fantasy',
  navTeam: 'Team',
  navSchedule: 'Schedule',
  navScheduleShort: 'Sched',
  navLeague: 'League',

  // Footer
  footerConnected: 'Real results & stats via ESPN.',
  footerSnapshot: (asOf) => `Snapshot as of ${asOf}.`,
  footerNoSim: 'Scored from real finished matches only .',
  footerCredit: 'Homeside · an unofficial 2026 companion',

  // Home
  homeLabel: 'Homeside · 2026 knockouts',
  homeTitle: 'Two games. Real results.',
  homeDesc: 'Predict the knockout bracket and build a five-player fantasy team. Everything is scored from real match results — no guesses by the app, no win odds.',
  homePredictTitle: 'Predict the bracket',
  homePredictHow: 'Tap a winner for every tie, up to the champion. Correct picks score as real matches finish.',
  homeFantasyTitle: 'Five-player fantasy',
  homeFantasyHow: 'Pick a keeper, defender, midfielder, attacker and a flex. They score from real goals, assists, clean sheets & saves — with transfers and a captain each round.',
  homeSquadSub: 'picked',
  homeSquadComplete: 'squad complete',
  homeBuildFive: 'build your five',
  homeAbilityCard: (name) => `${name} ability card`,
  homeAbilitySub: 'A radar of real tournament stats',
  homeNote: (asOf) => `Results & stats from ESPN (free, no key). Snapshot baseline ${asOf}. Knockouts grade as real matches are played.`,

  // Predict
  predictLabel: 'Predict the bracket',
  predictTitle: 'Pick every winner',
  predictDesc: 'Tap a team to predict who wins each tie — your picks carry forward to the next round, all the way to a champion. Each match locks at kickoff; confirm the full bracket early for a 1.2x bonus on correct picks that were locked before kickoff.',
  predictGraded: (c, t) => `pts · ${c}/${t} graded`,
  predictBonusHint: 'Early-lock bonus: correct picks score 1.2x when your bracket was confirmed before that match kicked off.',
  predictScoreBreakdown: (base, bonus) => `${base} base + ${bonus} early-lock bonus`,
  predictLockedIn: 'Locked in',
  predictReset: 'Reset',
  predictConfirmBtn: 'Confirm bracket',
  predictChampion: 'Your champion',
  predictFinal: 'Final',
  predictThirdPlace: 'Third Place Match',
  predictConfirmTitle: 'Confirm your bracket?',
  predictConfirmDesc: (champion) =>
    champion
      ? `Once you confirm, your picks are locked in and can't be changed. Correct picks locked before kickoff score 1.2x. Make sure your champion is ${champion}.`
      : "Once you confirm, your picks are locked in and can't be changed. Correct picks locked before kickoff score 1.2x.",
  predictCancel: 'Cancel',
  predictLock: 'Lock it in',
  predictFullTime: 'Full-time · ',
  predictTBD: 'TBD',

  // Fantasy
  fantasyLabel: 'Knockout fantasy',
  fantasyTitle: 'Your five through the bracket',
  fantasyTotal: 'total',
  fantasyLive: 'Live',
  fantasyTransfersOpen: 'transfers open',
  fantasyBuildFive: 'build your five',
  fantasyLocked: 'locked — under way',
  fantasyMaxCountry: (n) => `Max ${n} / country`,
  fantasyTransfersUsed: (used, free) => `Transfers ${used}${free != null ? ` / ${free} free` : ''}`,
  fantasyPaidPts: (pts) => ` · −${pts} pts`,
  fantasyUnlimited: 'unlimited free changes',
  fantasyGoalEnd: 'Your goal',
  fantasyAttackEnd: 'Attack',
  fantasyHowToScore: 'How to score',
  fantasyHowSub: 'Real ESPN box-score events, graded as each match finishes. Captain scores ×2.',
  fantasyCaptain: 'Captain',
  fantasyChangePlayer: 'Change player',
  fantasyRemove: 'Remove',
  fantasyPickFive: 'Pick your five',
  fantasyMakeTransfers: 'Make transfers',
  fantasyUnlimitedBuild: 'Unlimited changes — build your five',
  fantasyReset: 'Reset',
  fantasySave: 'Save',
  fantasyCancel: 'Cancel',
  fantasyRoundLocked: 'This round is locked and under way.',
  fantasyPtsOnSave: (pts) => ` · −${pts} pts on save`,
  fantasyUnlimitedMobile: 'Unlimited changes',
  fantasyRoundLabel: {
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter-finals',
    SF: 'Semi-finals',
    FINAL: 'Final stage',
  },
  fantasySlotLabel: { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', ATT: 'Forward', FLEX: 'Flex' },
  fantasyPosAbbr: { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'FWD' },
  fantasyScoringRules: [
    { label: 'Goal', value: 'FWD +4 · MID +5 · DEF/GK +6' },
    { label: 'Assist', value: '+3' },
    { label: 'Clean sheet (team concedes 0)', value: 'DEF/GK +4 · MID +1' },
    { label: 'GK saves', value: '+1 per 3' },
    { label: 'In-play penalty scored', value: 'goal points by position' },
    { label: 'In-play penalty missed', value: '−2' },
    { label: 'Shootout kick scored', value: '+2' },
    { label: 'Shootout kick missed', value: '−1' },
    { label: 'Yellow card', value: '−1' },
    { label: 'Red card', value: '−3' },
    { label: 'Own goal', value: '−2' },
  ],
  fantasyPlayerMatching: 'Player matching is best-effort by team + name.',

  // Team
  teamNationalLabel: (g) => `National team · Group ${g}`,
  teamTopSeed: 'Top seed · Pot 1',
  teamPot: (n) => `Pot ${n}`,
  teamHost: 'Host nation',
  teamThrough: 'Through to knockouts',
  teamEliminated: 'Eliminated',
  teamBackTo: (name) => `← Back to ${name}`,
  teamBackToMobile: (name) => `← ${name}`,
  teamPosLines: [
    ['GK', 'Goalkeepers'],
    ['DF', 'Defenders'],
    ['MF', 'Midfielders'],
    ['FW', 'Forwards'],
  ],
  teamPosName: { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' },
  teamNoSquad: (name) => `The squad list for ${name} isn't available yet.`,
  teamPlayersToKnow: 'Players to know',
  teamFullSquad: 'Full squad',
  teamPlayers: (n, u) => `${n} players${u ? ' · unconfirmed' : ''}`,
  teamAbilityCard: 'Ability card',
  teamRealStats: (n) => `Real stats · ${n} ${n === 1 ? 'match' : 'matches'}`,
  teamUpdating: '· updating…',
  teamProvisional: 'provisional',
  teamRatings: 'Ratings',
  teamNullAxis: '— = not enough real data for this axis yet (never fabricated).',
  teamNoMatches: 'No matches played yet.',
  teamLive: 'LIVE',
  teamNext: 'Next',
  teamRecord: 'Record',
  teamForm: 'Form',
  teamGoals: 'Goals',
  teamSquad: 'Squad',
  teamAbilityNoData: (name, status, healthKnown) => {
    if (!healthKnown) return `The ability card is built from ${name}'s real match stats. Checking the live data feed…`
    if (status === 'ok') return `The ability card is built from ${name}'s real match stats. It appears once the team has played and the match is in the live data feed.`
    return `The ability card is built from ${name}'s real match stats.`
  },
  teamAxisLabel: {
    attack: 'Attack',
    finishing: 'Finishing',
    possession: 'Possession',
    defense: 'Defense',
    creativity: 'Creativity',
    discipline: 'Discipline',
  },

  // Schedule
  scheduleTitle: 'World Cup',
  scheduleFollowing: (name, group) => `Following ${name} · Group ${group}`,
  scheduleGroupLabel: (g) => `Group ${g}`,
  scheduleStandings: 'Standings',
  scheduleTeamCol: 'Team',
  scheduleAdvancing: 'Advancing',
  scheduleEliminated: 'Eliminated',
  scheduleAdvanceNote: 'Top two advance, plus the eight best third-placed teams.',
  scheduleFixtures: 'Fixtures & results',
  scheduleMatches: (n) => `${n} matches`,
  scheduleMatchday: (n) => `Matchday ${n}`,
  scheduleGroupMatch: (n) => `Group Stage · Match ${n}`,
  scheduleLive: 'Live',
  scheduleFT: 'FT',

  // Leaderboard
  leagueLabel: 'Homeside · 2026',
  leagueTitle: 'League',
  leagueGuestNote: 'Viewing as a guest. Sign in to play and join the board.',
  leagueSignIn: 'Sign in',
  leagueLoadError: (msg) => `Couldn't load the league (${msg}).`,
  leagueLoading: 'Loading the league…',
  leagueEmpty: "No one has joined yet. You're first — make your picks!",
  leagueHashCol: '#',
  leaguePlayerCol: 'Player',
  leagueYou: 'you',
  leagueScoring: 'Scoring from finished matches…',
  leagueScoringDone: 'Scored from real finished matches via ESPN — same math as each game screen.',
  leagueSessionCheck: 'Checking your session…',

  // TeamPicker
  pickerLabel: 'Homeside · 2026',
  pickerTitle: 'Pick a home team.',
  pickerDesc: 'Choose one nation to follow all summer. It becomes your home base — a little mascot to keep company as the team plays its real matches.',
  pickerSearch: 'Search 48 teams…',
  pickerGroup: (g) => `Group ${g}`,
  pickerAllTeams: 'All teams',
  pickerGroupHero: (g) => `Group ${g} · your home team`,
  pickerHeroDesc: (name, symbol) => `This is your home base — its little mascot, tinted in ${name}'s colours and shaped by its ${symbol.toLowerCase()}, plus an ability card built from real stats. Then play the bracket prediction and fantasy games.`,
  pickerBackToHome: 'Back to home base',
  pickerBegin: 'Begin the season together',

  // TeamSwitcher
  switcherSearch: 'Search 48 teams…',
  switcherTitle: 'View a team',
  switcherHome: 'home',
  switcherNoMatch: 'No team matches',

  // PlayerPicker
  poolTitle: 'Player pool',
  poolPickSlot: (label) => `Pick your ${label.toLowerCase()}`,
  poolFillFlex: 'Filling Flex — any outfielder (defender, midfielder or forward).',
  poolFillSlot: (label) => `Filling ${label.toLowerCase()}.`,
  poolBrowse: 'Tap ＋ to add — each pick drops into the first open spot.',
  poolSearchPlaceholder: 'Search by name, club or country…',
  poolAll: 'All',
  poolShowAll: 'show all',
  poolAddable: (n) => `${n} addable`,
  poolCountryFull: 'country quota full',
  poolNoMatch: 'No players match.',
  poolBack: 'Squad',

  // MatchReport
  reportLoading: 'Loading report…',
  reportChecking: 'Checking the live data feed…',
  reportFinalScore: 'Final score recorded.',
  reportUnavailable: 'A detailed report for this match isn\'t available yet.',
  reportTeamStats: 'Team Stats',
  reportStatLabels: [
    ['Possession %', 'possession', '%'],
    ['Shots', 'shots', ''],
    ['Shots on Goal', 'shotsOnTarget', ''],
    ['Corner Kicks', 'corners', ''],
    ['Total Passes', 'passes', ''],
    ['Passing Accuracy %', 'passAcc', '%'],
    ['Offsides', 'offsides', ''],
    ['Fouls', 'fouls', ''],
    ['Yellow Cards', 'cards', ''],
  ],
  reportOG: '(OG)',
  reportPen: '(pen)',
  reportGoalFallback: 'Goal',
  liveDataNote: (status) => {
    switch (status) {
      case 'rate-limited': return 'Live data is rate-limited right now — the free feed allows only 100 requests a day. It fills in automatically once the daily limit resets.'
      case 'error': return 'The live data feed is temporarily unavailable. It will fill in automatically once the feed is back.'
      case 'no-key': return 'Live data isn\'t connected yet — goals, possession and shots appear here once it is.'
      case 'ok': return 'This match isn\'t in the live data feed yet.'
    }
  },

  // KnockoutProgress
  progressChampions: 'Champions crowned',
  progressRun: 'Knockout run',
  progressLive: 'Live',
  progressFinal: 'Final',
  progressPts: (n) => `${n} pts`,

  // Auth
  authSignIn: 'Sign in',
  authSignOut: 'Sign out',
  authAccountTitle: 'Your account',
  authAccountDesc: 'Your bracket and fantasy picks sync to the cloud, so you show up on the league leaderboard. Nothing else is shared.',
  authLeagueLabel: 'Homeside league',
  authJoinTitle: 'Join the league.',
  authJoinDesc: 'Sign in to put your bracket and fantasy scores on the leaderboard against your friends. Your picks stay yours — sign-in just keeps the scoreboard honest.',
  authGoogle: 'Continue with Google',
  authGuest: 'You can keep playing without signing in.',
  authRequireTitle: 'Sign in to play.',
  authRequireDesc: 'Your bracket and fantasy picks save to your account and score on the league leaderboard. You can browse the leaderboard without an account.',

  // ErrorBoundary
  errorTitle: 'Something hiccuped.',
  errorDesc: 'The home base ran into an unexpected error. A reload usually settles it — your home team is saved.',
  errorReload: 'Reload',

  // ThemeToggle
  themeToLight: 'Switch to light mode',
  themeToDark: 'Switch to dark mode',

  // atoms
  atomFormLabel: 'Form:',
  atomNotPlayed: 'Not yet played',
  atomVs: 'vs',

  // LangToggle
  langToggleLabel: '中文',
}

const zh: Translations = {
  // Nav
  navPredict: '預測',
  navFantasy: 'Fantasy',
  navTeam: '球隊',
  navSchedule: '賽程',
  navScheduleShort: '賽程',
  navLeague: '聯賽',

  // Footer
  footerConnected: '數據來源：ESPN。',
  footerSnapshot: (asOf) => `快照截至 ${asOf}。`,
  footerNoSim: '僅計算已完賽比賽得分。',
  footerCredit: 'Homeside · 非官方 2026 年世界盃',

  // Home
  homeLabel: 'Homeside · 2026 淘汰賽',
  homeTitle: '兩個遊戲。真實結果。',
  homeDesc: '預測淘汰賽名單，組建五人 Fantasy 球隊。所有得分來自真實比賽結果——不靠猜測，不看賠率。',
  homePredictTitle: '預測晉級名單',
  homePredictHow: '每場比賽點擊勝出隊伍，直到冠軍出爐。正確預測在比賽結束後計分。',
  homeFantasyTitle: '五人 Fantasy',
  homeFantasyHow: '選一名門將、後衛、中場、前鋒及彈性位。依真實進球、助攻、零失球及撲救計分——每輪可換人、可設隊長。',
  homeSquadSub: '已選',
  homeSquadComplete: '陣容完整',
  homeBuildFive: '建立你的五人組',
  homeAbilityCard: (name) => `${name} 能力卡`,
  homeAbilitySub: '真實賽事數據雷達',
  homeNote: (asOf) => `數據來源：ESPN（免費，無需金鑰）。快照截至 ${asOf}。淘汰賽在真實比賽進行後計分。`,

  // Predict
  predictLabel: '預測晉級名單',
  predictTitle: '挑選每場勝者',
  predictDesc: '點擊隊伍預測每場比賽勝者，預測會延續至下一輪直到冠軍。每場開賽後即鎖定；提前確認整張 bracket，開賽前已鎖定且猜中的場次可得 1.2x。',
  predictGraded: (c, t) => `分 · ${c}/${t} 已評分`,
  predictBonusHint: '提前鎖定加成：若整張 bracket 在該場開賽前已確認，猜中該場得分為 1.2x。',
  predictScoreBreakdown: (base, bonus) => `${base} 基礎 + ${bonus} 提前鎖定加成`,
  predictLockedIn: '已鎖定',
  predictReset: '重設',
  predictConfirmBtn: '確認名單',
  predictChampion: '你的冠軍',
  predictFinal: '決賽',
  predictThirdPlace: '季軍賽',
  predictConfirmTitle: '確認晉級名單？',
  predictConfirmDesc: (champion) =>
    champion
      ? `確認後，你的預測將被鎖定且無法更改。開賽前已鎖定且猜中的場次會以 1.2x 計分。請確認你的冠軍是 ${champion}。`
      : '確認後，你的預測將被鎖定且無法更改。開賽前已鎖定且猜中的場次會以 1.2x 計分。',
  predictCancel: '取消',
  predictLock: '確認鎖定',
  predictFullTime: '終場 · ',
  predictTBD: '待定',

  // Fantasy
  fantasyLabel: '淘汰賽 Fantasy',
  fantasyTitle: '你的五人陣容',
  fantasyTotal: '總計',
  fantasyLive: '直播中',
  fantasyTransfersOpen: '換人開放中',
  fantasyBuildFive: '建立你的五人組',
  fantasyLocked: '已鎖定——進行中',
  fantasyMaxCountry: (n) => `每國最多 ${n} 人`,
  fantasyTransfersUsed: (used, free) => `換人 ${used}${free != null ? ` / ${free} 免費` : ''}`,
  fantasyPaidPts: (pts) => ` · −${pts} 分`,
  fantasyUnlimited: '無限次免費換人',
  fantasyGoalEnd: '你的球門',
  fantasyAttackEnd: '進攻端',
  fantasyHowToScore: '計分規則',
  fantasyHowSub: '來自 ESPN 真實比賽事件，比賽結束後計分。隊長得分 ×2。',
  fantasyCaptain: '隊長',
  fantasyChangePlayer: '更換球員',
  fantasyRemove: '移除',
  fantasyPickFive: '選擇你的五人組',
  fantasyMakeTransfers: '進行換人',
  fantasyUnlimitedBuild: '無限換人——建立你的五人組',
  fantasyReset: '重設',
  fantasySave: '儲存',
  fantasyCancel: '取消',
  fantasyRoundLocked: '本輪已鎖定且正在進行中。',
  fantasyPtsOnSave: (pts) => ` · 儲存時扣 −${pts} 分`,
  fantasyUnlimitedMobile: '無限次換人',
  fantasyRoundLabel: {
    R32: '32 強賽',
    R16: '16 強賽',
    QF: '八強賽',
    SF: '四強賽',
    FINAL: '決賽階段',
  },
  fantasySlotLabel: { GK: '門將', DEF: '後衛', MID: '中場', ATT: '前鋒', FLEX: '自由人' },
  fantasyPosAbbr: { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'FWD' },
  fantasyScoringRules: [
    { label: '進球', value: '前鋒 +4 · 中場 +5 · 後衛/門將 +6' },
    { label: '助攻', value: '+3' },
    { label: '零封', value: '後衛/門將 +4 · 中場 +1' },
    { label: '門將撲救', value: '每 3 次 +1' },
    { label: '場內 12 碼進球', value: '依位置計進球分' },
    { label: '場內 12 碼未進', value: '−2' },
    { label: '12 碼戰進球', value: '+2' },
    { label: '12 碼戰未進', value: '−1' },
    { label: '黃牌', value: '−1' },
    { label: '紅牌', value: '−3' },
    { label: '烏龍球', value: '−2' },
  ],
  fantasyPlayerMatching: '球員配對依隊伍＋姓名比對。',

  // Team
  teamNationalLabel: (g) => `國家隊 · ${g} 組`,
  teamTopSeed: '頭號種子 · 第 1 組',
  teamPot: (n) => `第 ${n} 組`,
  teamHost: '地主國',
  teamThrough: '晉級淘汰賽',
  teamEliminated: '已淘汰',
  teamBackTo: (name) => `← 返回 ${name}`,
  teamBackToMobile: (name) => `← ${name}`,
  teamPosLines: [
    ['GK', '門將'],
    ['DF', '後衛'],
    ['MF', '中場'],
    ['FW', '前鋒'],
  ],
  teamPosName: { GK: '門將', DF: '後衛', MF: '中場', FW: '前鋒' },
  teamNoSquad: (name) => `${name} 的大名單尚未提供——確認後將自動顯示。`,
  teamPlayersToKnow: '重點球員',
  teamFullSquad: '完整名單',
  teamPlayers: (n, u) => `${n} 名球員${u ? '·未確認' : ''}`,
  teamAbilityCard: '能力卡',
  teamRealStats: (n) => `真實數據 · ${n} 場`,
  teamUpdating: '· 更新中…',
  teamProvisional: '暫定',
  teamRatings: '評分',
  teamNullAxis: '— 代表此項目尚無足夠真實數據（從不編造）。',
  teamNoMatches: '尚無比賽記錄。',
  teamLive: '直播',
  teamNext: '下一場',
  teamRecord: '戰績',
  teamForm: '近況',
  teamGoals: '進球',
  teamSquad: '名單',
  teamAbilityNoData: (name, status, healthKnown) => {
    if (!healthKnown) return `能力卡依 ${name} 的真實比賽數據建立。檢查即時資料來源中…`
    if (status === 'ok') return `能力卡依 ${name} 的真實比賽數據建立。球隊完賽且數據進入即時資料後將顯示。`
    return `能力卡依 ${name} 的真實比賽數據建立。`
  },
  teamAxisLabel: {
    attack: '攻擊',
    finishing: '射門',
    possession: '控球',
    defense: '防守',
    creativity: '創造力',
    discipline: '紀律',
  },

  // Schedule
  scheduleTitle: '世界盃',
  scheduleFollowing: (name, group) => `追蹤 ${name} · ${group} 組`,
  scheduleGroupLabel: (g) => `${g} 組`,
  scheduleStandings: '積分榜',
  scheduleTeamCol: '球隊',
  scheduleAdvancing: '晉級',
  scheduleEliminated: '淘汰',
  scheduleAdvanceNote: '前兩名晉級，加上八支最佳第三名。',
  scheduleFixtures: '賽程與結果',
  scheduleMatches: (n) => `${n} 場`,
  scheduleMatchday: (n) => `第 ${n} 輪`,
  scheduleGroupMatch: (n) => `小組賽 · 第 ${n} 場`,
  scheduleLive: '直播中',
  scheduleFT: '終場',

  // Leaderboard
  leagueLabel: 'Homeside · 2026',
  leagueTitle: '聯賽',
  leagueGuestNote: '以訪客身份瀏覽。登入以參與排名。',
  leagueSignIn: '登入',
  leagueLoadError: (msg) => `無法載入聯賽（${msg}）。`,
  leagueLoading: '載入聯賽中…',
  leagueEmpty: '目前無人加入。你是第一個——開始預測吧！',
  leagueHashCol: '#',
  leaguePlayerCol: '玩家',
  leagueYou: '你',
  leagueScoring: '統計已完賽比賽得分中…',
  leagueScoringDone: '得分來自 ESPN 真實完賽比賽——與各遊戲頁面計算方式相同。',
  leagueSessionCheck: '確認登入狀態中…',

  // TeamPicker
  pickerLabel: 'Homeside · 2026',
  pickerTitle: '選擇主隊。',
  pickerDesc: '選擇一支國家隊全程追蹤。它將成為你的主場——陪伴你的隊伍打完所有真實比賽的小吉祥物。',
  pickerSearch: '搜尋 48 支球隊…',
  pickerGroup: (g) => `${g} 組`,
  pickerAllTeams: '所有球隊',
  pickerGroupHero: (g) => `${g} 組 · 你的主隊`,
  pickerHeroDesc: (name, symbol) => `這是你的主場——以 ${name} 的配色和 ${symbol.toLowerCase()} 形象打造的小吉祥物，加上真實數據建立的能力卡。接著參與淘汰賽預測和 Fantasy 遊戲。`,
  pickerBackToHome: '返回主場',
  pickerBegin: '與你的球隊開始這個賽季',

  // TeamSwitcher
  switcherSearch: '搜尋 48 支球隊…',
  switcherTitle: '瀏覽球隊',
  switcherHome: '主隊',
  switcherNoMatch: '找不到符合的球隊',

  // PlayerPicker
  poolTitle: '球員庫',
  poolPickSlot: (label) => `選擇你的${label}`,
  poolFillFlex: '填補彈性位——任何外場球員（後衛、中場或前鋒）。',
  poolFillSlot: (label) => `填補${label}。`,
  poolBrowse: '點擊 ＋ 新增——每次選擇填入第一個空位。',
  poolSearchPlaceholder: '依姓名、俱樂部或國家搜尋…',
  poolAll: '全部',
  poolShowAll: '顯示全部',
  poolAddable: (n) => `${n} 可新增`,
  poolCountryFull: '國家人數已達上限',
  poolNoMatch: '找不到符合的球員。',
  poolBack: '返回名單',

  // MatchReport
  reportLoading: '載入報告中…',
  reportChecking: '檢查即時資料中…',
  reportFinalScore: '最終比分已記錄。',
  reportUnavailable: '詳細報告尚未提供。',
  reportTeamStats: '球隊數據',
  reportStatLabels: [
    ['控球率 %', 'possession', '%'],
    ['射門', 'shots', ''],
    ['射正', 'shotsOnTarget', ''],
    ['角球', 'corners', ''],
    ['總傳球', 'passes', ''],
    ['傳球準確率 %', 'passAcc', '%'],
    ['越位', 'offsides', ''],
    ['犯規', 'fouls', ''],
    ['黃牌', 'cards', ''],
  ],
  reportOG: '（烏龍球）',
  reportPen: '（12碼）',
  reportGoalFallback: '進球',
  liveDataNote: (status) => {
    switch (status) {
      case 'rate-limited': return '即時資料目前受到請求限制——免費 API 每天僅允許 100 次請求，每日限制重置後將自動補充。'
      case 'error': return '即時資料暫時無法使用，資料恢復後將自動補充。'
      case 'no-key': return '尚未連結即時資料——進球、控球率和射門等數據連結後將顯示於此。'
      case 'ok': return '此比賽尚未進入即時資料。'
    }
  },

  // KnockoutProgress
  progressChampions: '冠軍誕生',
  progressRun: '淘汰賽賽程',
  progressLive: '直播',
  progressFinal: '決賽',
  progressPts: (n) => `${n} 分`,

  // Auth
  authSignIn: '登入',
  authSignOut: '登出',
  authAccountTitle: '你的帳號',
  authAccountDesc: '你的預測與 Fantasy 選擇已同步至雲端，讓你出現在聯賽排行榜上。不分享其他資料。',
  authLeagueLabel: 'Homeside 聯賽',
  authJoinTitle: '加入聯賽。',
  authJoinDesc: '登入後，你的預測與 Fantasy 得分將出現在排行榜上與朋友競爭。選擇仍屬於你——登入只是讓計分板更準確。',
  authGoogle: '以 Google 繼續',
  authGuest: '也可以不登入直接遊玩。',
  authRequireTitle: '請登入以遊玩。',
  authRequireDesc: '你的預測與 Fantasy 選擇儲存於帳號並計入聯賽排行榜。可以不登入瀏覽排行榜。',

  // ErrorBoundary
  errorTitle: '發生了一些錯誤。',
  errorDesc: '主場遇到了意外的錯誤。重新載入通常能解決——你的主隊已儲存。',
  errorReload: '重新載入',

  // ThemeToggle
  themeToLight: '切換為亮色模式',
  themeToDark: '切換為暗色模式',

  // atoms
  atomFormLabel: '近況：',
  atomNotPlayed: '尚未出賽',
  atomVs: 'vs',

  // LangToggle
  langToggleLabel: 'EN',
}

export const translations: Record<Lang, Translations> = { en, zh }

export function getT(lang: Lang): Translations {
  return translations[lang]
}
