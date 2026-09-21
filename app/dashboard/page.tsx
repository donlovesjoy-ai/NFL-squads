import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  const { data: squad } = await supabase
    .from('squads')
    .select('id,squad_name,owner_name,nba_team_id,nba_teams(name,abbreviation,conference,division)')
    .eq('user_id', user.id)
    .eq('season_year', 2026)
    .maybeSingle()

  const { data: season } = await supabase
    .from('seasons')
    .select('label,regular_selection_limit,regular_window_ends_on,playoff_set_count,playoff_set_game_limit')
    .eq('season_year', 2026)
    .maybeSingle()

  let used = 0
  if (squad?.id) {
    const { count } = await supabase
      .from('squad_game_selections')
      .select('*', { count: 'exact', head: true })
      .eq('squad_id', squad.id)
    used = count || 0
  }

  const team: any = Array.isArray((squad as any)?.nba_teams) ? (squad as any).nba_teams[0] : (squad as any)?.nba_teams

  return (
    <main style={{maxWidth:900,margin:'0 auto',padding:'28px 18px 60px'}}>
      <h1 style={{textAlign:'center',marginBottom:6}}>NBA SQUADS</h1>
      <p style={{textAlign:'center',opacity:.75,marginTop:0}}>{season?.label || '2026–27 Season'}</p>
      <Nav commissioner={profile?.role === 'commissioner'} />

      <section style={{marginTop:34,padding:24,border:'1px solid #444',borderRadius:16}}>
        <h2 style={{marginTop:0}}>Your Squad</h2>
        {squad ? <>
          <div style={{fontSize:26,fontWeight:800}}>{squad.squad_name}</div>
          <div style={{marginTop:8,fontSize:18}}>{team?.name || 'NBA team'} {team?.abbreviation ? `(${team.abbreviation})` : ''}</div>
          <div style={{opacity:.7,marginTop:4}}>{team?.conference} {team?.division}</div>
        </> : <p>No NBA team has been assigned to this account yet.</p>}
      </section>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,marginTop:18}}>
        <div style={{padding:22,border:'1px solid #444',borderRadius:16}}>
          <div style={{fontSize:34,fontWeight:900}}>{used} / {season?.regular_selection_limit || 50}</div>
          <div style={{opacity:.75}}>Regular-season games selected</div>
        </div>
        <div style={{padding:22,border:'1px solid #444',borderRadius:16}}>
          <div style={{fontSize:24,fontWeight:800}}>March 15, 2027</div>
          <div style={{opacity:.75}}>Regular-season selection cutoff</div>
        </div>
        <div style={{padding:22,border:'1px solid #444',borderRadius:16}}>
          <div style={{fontSize:34,fontWeight:900}}>2 × 5</div>
          <div style={{opacity:.75}}>Playoff sets after the regular season</div>
        </div>
      </section>
    </main>
  )
}
