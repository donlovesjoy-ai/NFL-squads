import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import { submitPick } from './actions'

function fmtSpread(n:number|null){
  if(n===null) return 'Line not posted'
  if(n===0) return 'PK'
  return n>0?`+${n}`:`${n}`
}

export default async function MyPick({searchParams}:{searchParams:Promise<{saved?:string,error?:string}>}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const commissioner=profile?.role==='commissioner'

  const {data:squad}=await supabase.from('squads')
    .select('id,squad_name,nfl_team_id').eq('user_id',user.id).eq('season_year',2026).maybeSingle()

  if(!squad) return <main className="wrap"><Nav commissioner={commissioner}/><h1>My Pick</h1><div className="card">Your squad has not been assigned yet.</div></main>

  const now=new Date().toISOString()
  const {data:games}=await supabase.from('games')
    .select('id,nfl_week,kickoff_time,spread,home_team_id,away_team_id,home:nfl_teams!games_home_team_id_fkey(name,abbreviation),away:nfl_teams!games_away_team_id_fkey(name,abbreviation)')
    .eq('season_year',2026).gte('kickoff_time',now)
    .or(`home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`)
    .order('kickoff_time',{ascending:true}).limit(1)

  const game:any=games?.[0]
  if(!game) return <main className="wrap"><Nav commissioner={commissioner}/><h1>My Pick</h1><div className="card">No upcoming game found.</div></main>

  const {data:pick}=await supabase.from('picks').select('selection_team_id,result,ats_margin').eq('squad_id',squad.id).eq('game_id',game.id).maybeSingle()
  const deadline=new Date(new Date(game.kickoff_time).getTime()-60_000)
  const locked=new Date()>=deadline

  const homeSpread=game.spread===null?null:Number(game.spread)
  const awaySpread=homeSpread===null?null:-homeSpread

  return <main className="wrap">
    <Nav commissioner={commissioner}/><h1>My Pick</h1>
    <div className="card">
      <h2>Week {game.nfl_week}</h2>
      <p><b>Kickoff:</b> {new Date(game.kickoff_time).toLocaleString()}</p>
      <p><b>Pick deadline:</b> {deadline.toLocaleString()}</p>
      {sp.saved&&<p className="status">Pick saved.</p>}
      {sp.error&&<p className="status">Unable to save pick: {sp.error}</p>}
      {pick&&<p className="status">Current pick submitted.</p>}
      <form action={submitPick}>
        <input type="hidden" name="squad_id" value={squad.id}/>
        <input type="hidden" name="game_id" value={game.id}/>
        <label className="pick">
          <input type="radio" name="selection_team_id" value={game.away_team_id} defaultChecked={pick?.selection_team_id===game.away_team_id} required/>
          {' '}{game.away?.name} {fmtSpread(awaySpread)}
        </label>
        <label className="pick">
          <input type="radio" name="selection_team_id" value={game.home_team_id} defaultChecked={pick?.selection_team_id===game.home_team_id} required/>
          {' '}{game.home?.name} {fmtSpread(homeSpread)}
        </label>
        <button className="submit" type="submit" disabled={locked||homeSpread===null}>
          {locked?'Pick Locked':homeSpread===null?'Waiting for Closing Line':'Submit / Update Pick'}
        </button>
      </form>
    </div>
  </main>
}
