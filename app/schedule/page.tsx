import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'

function formatTipoff(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(value))
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  const { data: games } = await supabase
    .from('games')
    .select('id,scheduled_tipoff_time,status,home_score,away_score,home_spread,home:nba_teams!games_home_team_id_fkey(name,abbreviation),away:nba_teams!games_away_team_id_fkey(name,abbreviation)')
    .eq('season_year', 2026)
    .order('scheduled_tipoff_time', { ascending: true })
    .limit(250)

  return (
    <main style={{maxWidth:1000,margin:'0 auto',padding:'28px 18px 60px'}}>
      <h1 style={{textAlign:'center'}}>NBA Schedule & Results</h1>
      <Nav commissioner={profile?.role === 'commissioner'} />
      <p style={{textAlign:'center',opacity:.7}}>All times Eastern</p>

      {!games?.length ? (
        <div style={{marginTop:32,padding:28,border:'1px solid #444',borderRadius:16,textAlign:'center'}}>
          The 2026–27 NBA schedule has not been loaded yet.
        </div>
      ) : (
        <div style={{marginTop:28,display:'grid',gap:10}}>
          {games.map((game: any) => {
            const home = Array.isArray(game.home) ? game.home[0] : game.home
            const away = Array.isArray(game.away) ? game.away[0] : game.away
            return (
              <div key={game.id} style={{display:'grid',gridTemplateColumns:'150px 1fr 105px 90px',gap:12,alignItems:'center',padding:'14px 16px',border:'1px solid #3d3d3d',borderRadius:12}}>
                <div style={{fontSize:14,opacity:.78}}>{formatTipoff(game.scheduled_tipoff_time)}</div>
                <div><strong>{away?.abbreviation || away?.name}</strong> @ <strong>{home?.abbreviation || home?.name}</strong></div>
                <div style={{textAlign:'center'}}>{game.home_spread == null ? '—' : `Home ${Number(game.home_spread) > 0 ? '+' : ''}${game.home_spread}`}</div>
                <div style={{textAlign:'right',fontWeight:700}}>{game.status === 'final' ? `${game.away_score}–${game.home_score}` : game.status}</div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
