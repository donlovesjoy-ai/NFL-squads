import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football'

type League = 'nfl' | 'college-football'

function validDate(value: string | null) {
  return Boolean(value && /^\d{8}$/.test(value))
}

function toNumber(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get('league') as League | null
  const date = req.nextUrl.searchParams.get('date')

  if (league !== 'nfl' && league !== 'college-football') {
    return NextResponse.json({ error: 'league must be nfl or college-football' }, { status: 400 })
  }

  if (!validDate(date)) {
    return NextResponse.json({ error: 'date must be YYYYMMDD' }, { status: 400 })
  }

  const params = new URLSearchParams({ dates: date!, limit: league === 'nfl' ? '100' : '500' })
  if (league === 'college-football') params.set('groups', '80')

  const upstream = await fetch(`${ESPN_BASE}/${league}/scoreboard?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'accept-language': 'en-US,en;q=0.9',
      referer: 'https://www.espn.com/',
      'user-agent': 'Mozilla/5.0 (compatible; NFL-Squads-Scoreboard/1.0)',
    },
  })

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'scoreboard upstream unavailable', upstreamStatus: upstream.status },
      { status: 502 },
    )
  }

  const payload = await upstream.json()
  const events = (Array.isArray(payload?.events) ? payload.events : []).flatMap((event: any) => {
    const competition = event?.competitions?.[0]
    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : []
    const home = competitors.find((c: any) => c?.homeAway === 'home')
    const away = competitors.find((c: any) => c?.homeAway === 'away')

    if (!home?.team?.displayName || !away?.team?.displayName) return []

    const status = event?.status ?? competition?.status ?? {}
    const type = status?.type ?? {}

    return [{
      sourceEventId: String(event?.id ?? ''),
      kickoff: event?.date ?? competition?.date ?? null,
      homeTeam: home.team.displayName,
      awayTeam: away.team.displayName,
      homeScore: toNumber(home.score),
      awayScore: toNumber(away.score),
      completed: Boolean(type.completed),
      state: String(type.state ?? 'pre'),
      detail: String(type.detail ?? type.shortDetail ?? ''),
      period: toNumber(status?.period),
      clock: String(status?.displayClock ?? ''),
    }]
  })

  return NextResponse.json({
    ok: true,
    provider: 'espn',
    league,
    date,
    events,
    fetchedAt: new Date().toISOString(),
  })
}
