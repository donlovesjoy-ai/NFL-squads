import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'

function formatTipoff(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(value))
}

export default async function MyPickPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  const { data: squad } = await supabase
    .from('squads')
    .select('id,squad_name,nba_team_id,nba_teams(name,abbreviation)')
    .eq('user_id', user.id)
    .eq('season_year', 2026)
    .maybeSingle()

  if (!squad) {
    return <main style={{maxWidth:900,margin:'0 auto',padding:'28px 18px'}}><h1 style={{textAlign:'center'}}>My Games</h1><Nav commissioner={profile?.role === 'commissioner'} /><p style={{marginTop:30,textAlign:'center'}}>Your NBA team has not been assigned yet.</p></main>
  }

  const team: any = Array.isArray((squad as any).nba_teams) ? (squad as any).nba_teams[0] : (squad as any).nba_teams
  const { count: used } = await supabase
    .from('squad_game_selections')
    .select('*', { count: 'exact', head: true })
    .eq('squad_id', squad.id)

  const now = new Date().toISOString()
  const { data: games } = await supabase
    .from('games')
    .select('id,home_team_id,away_team_id,scheduled_tipoff_time,pick_lock_at,home_spread,status,home:nba_teams!games_home_team_id_fkey(name,abbreviation),away:nba_teams!games_away_team_id_fkey(name,abbreviation)')
    .eq('season_year', 2026)
    .gte('scheduled_tipoff_time', now)
    .or(`home_team_id.eq.${squad.nba_team_id},away_team_id.eq.${squad.nba_team_id}`)
    .order('scheduled_tipoff_time', { ascending: true })
    .limit(20)

  return (
    <main style={{maxWidth:900,margin:'0 auto',padding:'28px 18px 60px'}}>
      <h1 style={{textAlign:'center'}}>My Games</h1>
      <Nav commissioner={profile?.role === 'commissioner'} />
      <div style={{marginTop:28,padding:22,border:'1px solid #444',borderRadius:16,textAlign:'center'}}>
        <div style={{fontSize:22,fontWeight:800}}>{squad.squad_name}</div>
        <div style={{marginTop:4}}>{team?.name} ({team?.abbreviation})</div>
        <div style={{fontSize:30,fontWeight:900,marginTop:14}}>{used || 0} / 50</div>
        <div style={{opacity:.72}}>regular-season games selected</div>
      </div>

      <h2 style={{marginTop:34}}>Upcoming eligible games</h2>
      {!games?.length ? <p style={{opacity:.7}}>No upcoming games are loaded yet.</p> : (
        <div style={{display:'grid',gap:10}}>
          {games.map((game: any) => {
            const home = Array.isArray(game.home) ? game.home[0] : game.home
            const away = Array.isArray(game.away) ? game.away[0] : game.away
            return (
              <div key={game.id} style={{padding:'16px 18px',border:'1px solid #444',borderRadius:12,display:'grid',gridTemplateColumns:'1fr auto',gap:14,alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:800,fontSize:18}}>{away?.abbreviation || away?.name} @ {home?.abbreviation || home?.name}</div>
                  <div style={{marginTop:5,opacity:.72}}>{formatTipoff(game.scheduled_tipoff_time)} ET</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700}}>{game.home_spread == null ? 'Line pending' : `Home ${Number(game.home_spread) > 0 ? '+' : ''}${game.home_spread}`}</div>
                  <div style={{fontSize:13,opacity:.65,marginTop:4}}>{game.status}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <p style={{marginTop:24,opacity:.66,fontSize:14}}>Game-selection controls are the next conversion step. The page is now reading from the NBA schedule and your owned NBA team instead of the NFL weekly model.</p>
    </main>
  )
}
