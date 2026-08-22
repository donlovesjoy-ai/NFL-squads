import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import { submitTotal } from './actions'

export default async function Tiebreaker({searchParams}:{searchParams:Promise<{saved?:string,error?:string}>}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const commissioner=profile?.role==='commissioner'
  const {data:squad}=await supabase.from('squads').select('id,nfl_team_id,squad_name').eq('user_id',user.id).eq('season_year',2026).maybeSingle()
  if(!squad) redirect('/dashboard')

  const {data:matches}=await supabase.from('playoff_matchups')
    .select('id,nfl_week,status,squad_a_id,squad_b_id')
    .eq('season_year',2026).eq('status','needs_tiebreaker')
    .or(`squad_a_id.eq.${squad.id},squad_b_id.eq.${squad.id}`).limit(1)

  const m:any=matches?.[0]
  if(!m) return <main className="wrap"><Nav commissioner={commissioner}/><h1>Playoff Tiebreaker</h1><div className="card">No over/under tiebreaker is currently required.</div></main>

  const {data:gameRows}=await supabase.from('games')
    .select('id,home_team_id,away_team_id,home:nfl_teams!games_home_team_id_fkey(name),away:nfl_teams!games_away_team_id_fkey(name)')
    .eq('season_year',2026).eq('nfl_week',m.nfl_week)
    .or(`home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`).limit(1)
  const game:any=gameRows?.[0]

  return <main className="wrap">
    <Nav commissioner={commissioner}/><h1>Playoff Tiebreaker</h1>
    <div className="card">
      <h2>Week {m.nfl_week}</h2>
      <p>{game?.away?.name} at {game?.home?.name}</p>
      <p className="muted">Because both playoff opponents own NFL teams playing each other, submit the game total and Over/Under selection.</p>
      {sp.saved&&<p className="status">Tiebreaker saved.</p>}
      <form action={submitTotal}>
        <input type="hidden" name="matchup_id" value={m.id}/>
        <input type="hidden" name="squad_id" value={squad.id}/>
        <input type="hidden" name="game_id" value={game?.id}/>
        <label>Official game total</label>
        <input name="game_total" type="number" step="0.5" required/>
        <label>Selection</label>
        <select name="choice" required><option value="over">Over</option><option value="under">Under</option></select>
        <button className="submit">Submit Tiebreaker</button>
      </form>
    </div>
  </main>
}
