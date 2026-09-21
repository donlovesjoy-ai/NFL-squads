import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'

function formatTipoff(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatPeriodDates(start?: string | null, end?: string | null) {
  if (!start && !end) return ''
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric'
  })
  const startText = start ? fmt.format(new Date(`${start}T12:00:00-04:00`)) : ''
  const endText = end ? fmt.format(new Date(`${end}T12:00:00-04:00`)) : 'End of regular season'
  return startText && endText ? `${startText} – ${endText}` : startText || endText
}

export default async function MyPickPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const { data: squad } = await supabase
    .from('squads')
    .select('id,squad_name,nba_team_id,nba_teams(name,abbreviation)')
    .eq('user_id', user.id)
    .eq('season_year', 2026)
    .maybeSingle()

  if (!squad) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px' }}>
        <h1 style={{ textAlign: 'center' }}>My Games</h1>
        <Nav commissioner={profile?.role === 'commissioner'} />
        <p style={{ marginTop: 30, textAlign: 'center' }}>
          Your NBA team has not been assigned yet.
        </p>
      </main>
    )
  }

  const team: any = Array.isArray((squad as any).nba_teams)
    ? (squad as any).nba_teams[0]
    : (squad as any).nba_teams

  const { data: periods } = await supabase
    .from('competition_periods')
    .select('id,code,name,period_type,game_limit,starts_on,ends_on,sequence')
    .eq('season_year', 2026)
    .order('sequence', { ascending: true })

  const { data: selections } = await supabase
    .from('squad_game_selections')
    .select('id,game_id,competition_period_id,is_locked')
    .eq('squad_id', squad.id)

  const { data: forcedLosses } = await supabase
    .from('forced_losses')
    .select('id,game_id,competition_period_id')
    .eq('squad_id', squad.id)

  const now = new Date()
  const todayEt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)

  const orderedPeriods = periods || []
  const currentPeriod = orderedPeriods.find((p: any) => {
    const starts = !p.starts_on || todayEt >= p.starts_on
    const ends = !p.ends_on || todayEt <= p.ends_on
    return starts && ends
  }) || orderedPeriods.find((p: any) => p.starts_on && todayEt < p.starts_on) || orderedPeriods[orderedPeriods.length - 1]

  const activePeriodId = currentPeriod?.id
  const periodSelections = (selections || []).filter((s: any) => s.competition_period_id === activePeriodId)
  const periodForcedLosses = (forcedLosses || []).filter((x: any) => x.competition_period_id === activePeriodId)
  const completedCount = periodSelections.length + periodForcedLosses.length
  const target = Number(currentPeriod?.game_limit || 0)
  const needed = Math.max(0, target - completedCount)

  let eligibleGames: any[] = []
  if (currentPeriod) {
    let query = supabase
      .from('games')
      .select('id,home_team_id,away_team_id,scheduled_tipoff_time,pick_lock_at,home_spread,status,home:nba_teams!games_home_team_id_fkey(name,abbreviation),away:nba_teams!games_away_team_id_fkey(name,abbreviation)')
      .eq('season_year', 2026)
      .or(`home_team_id.eq.${squad.nba_team_id},away_team_id.eq.${squad.nba_team_id}`)
      .order('scheduled_tipoff_time', { ascending: true })

    if (currentPeriod.starts_on) {
      query = query.gte('scheduled_tipoff_time', `${currentPeriod.starts_on}T00:00:00-04:00`)
    }
    if (currentPeriod.ends_on) {
      query = query.lte('scheduled_tipoff_time', `${currentPeriod.ends_on}T23:59:59-04:00`)
    }

    const { data } = await query
    eligibleGames = data || []
  }

  const selectedIds = new Set(periodSelections.map((s: any) => Number(s.game_id)))
  const forcedLossIds = new Set(periodForcedLosses.map((x: any) => Number(x.game_id)))
  const remainingEligibleGames = eligibleGames.filter((g: any) => {
    const isPast = new Date(g.scheduled_tipoff_time) <= now
    return !isPast && !selectedIds.has(Number(g.id)) && !forcedLossIds.has(Number(g.id))
  })

  const remainingCount = remainingEligibleGames.length
  const allRemainingMandatory = needed > 0 && remainingCount <= needed
  const overallRegularSelected = (selections || []).filter((s: any) => {
    const period = orderedPeriods.find((p: any) => p.id === s.competition_period_id)
    return period?.period_type === 'regular'
  }).length
  const overallRegularLosses = (forcedLosses || []).filter((x: any) => {
    const period = orderedPeriods.find((p: any) => p.id === x.competition_period_id)
    return period?.period_type === 'regular'
  }).length

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px 60px' }}>
      <h1 style={{ textAlign: 'center' }}>My Games</h1>
      <Nav commissioner={profile?.role === 'commissioner'} />

      <div style={{ marginTop: 28, padding: 22, border: '1px solid #444', borderRadius: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{squad.squad_name}</div>
        <div style={{ marginTop: 4 }}>{team?.name} ({team?.abbreviation})</div>
        <div style={{ fontSize: 30, fontWeight: 900, marginTop: 14 }}>
          {overallRegularSelected + overallRegularLosses} / 50
        </div>
        <div style={{ opacity: .72 }}>regular-season games accounted for</div>
      </div>

      {currentPeriod && (
        <section style={{ marginTop: 22, padding: 20, border: '1px solid #555', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .65 }}>Current requirement</div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{currentPeriod.name}</div>
              <div style={{ marginTop: 4, opacity: .72 }}>{formatPeriodDates(currentPeriod.starts_on, currentPeriod.ends_on)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 34, fontWeight: 900 }}>{completedCount} / {target}</div>
              <div style={{ opacity: .72 }}>games accounted for</div>
            </div>
          </div>

          <div style={{ marginTop: 18, height: 10, borderRadius: 999, background: '#2a2a2a', overflow: 'hidden' }}>
            <div style={{ width: `${target ? Math.min(100, (completedCount / target) * 100) : 0}%`, height: '100%', background: '#fff' }} />
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
            <div style={{ padding: 12, border: '1px solid #444', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{needed}</div>
              <div style={{ fontSize: 13, opacity: .7 }}>still needed</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #444', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{remainingCount}</div>
              <div style={{ fontSize: 13, opacity: .7 }}>eligible games left</div>
            </div>
            <div style={{ padding: 12, border: '1px solid #444', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{periodForcedLosses.length}</div>
              <div style={{ fontSize: 13, opacity: .7 }}>automatic losses</div>
            </div>
          </div>

          {allRemainingMandatory && (
            <div style={{ marginTop: 16, padding: '12px 14px', border: '2px solid #fff', borderRadius: 12, fontWeight: 900, textAlign: 'center' }}>
              MANDATORY GAMES — You need {needed} more and only {remainingCount} eligible game{remainingCount === 1 ? '' : 's'} remain in this period.
            </div>
          )}

          {!allRemainingMandatory && needed > 0 && (
            <div style={{ marginTop: 14, textAlign: 'center', opacity: .72 }}>
              You may choose which {needed} of the remaining {remainingCount} eligible games count.
            </div>
          )}

          {needed === 0 && (
            <div style={{ marginTop: 14, textAlign: 'center', fontWeight: 800 }}>
              Requirement complete for this period.
            </div>
          )}
        </section>
      )}

      <h2 style={{ marginTop: 34 }}>{currentPeriod?.name || 'Upcoming'} games</h2>
      {!eligibleGames.length ? (
        <p style={{ opacity: .7 }}>No games are loaded for this period yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {eligibleGames.map((game: any) => {
            const home = Array.isArray(game.home) ? game.home[0] : game.home
            const away = Array.isArray(game.away) ? game.away[0] : game.away
            const selected = selectedIds.has(Number(game.id))
            const forcedLoss = forcedLossIds.has(Number(game.id))
            const future = new Date(game.scheduled_tipoff_time) > now
            const mandatory = future && !selected && !forcedLoss && allRemainingMandatory

            return (
              <div
                key={game.id}
                style={{
                  padding: '16px 18px',
                  border: mandatory ? '2px solid #fff' : '1px solid #444',
                  borderRadius: 12,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  opacity: forcedLoss ? .62 : 1
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    {away?.abbreviation || away?.name} @ {home?.abbreviation || home?.name}
                  </div>
                  <div style={{ marginTop: 5, opacity: .72 }}>{formatTipoff(game.scheduled_tipoff_time)} ET</div>
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900 }}>
                    {forcedLoss ? 'AUTOMATIC LOSS' : selected ? 'SELECTED' : mandatory ? 'MANDATORY' : future ? 'AVAILABLE' : 'NOT SELECTED'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>
                    {game.home_spread == null
                      ? 'Line pending'
                      : `Home ${Number(game.home_spread) > 0 ? '+' : ''}${game.home_spread}`}
                  </div>
                  <div style={{ fontSize: 13, opacity: .65, marginTop: 4 }}>{game.status}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 28, padding: 16, border: '1px solid #444', borderRadius: 12, fontSize: 14, lineHeight: 1.5, opacity: .8 }}>
        Each period has an exact requirement. When the number of games you still need equals the number of eligible games remaining, every remaining game becomes mandatory. Missing a mandatory game is recorded as an automatic loss.
      </div>
    </main>
  )
}
