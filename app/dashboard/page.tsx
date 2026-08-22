import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'

function fmtSpread(n:any){
  if(n===null || n===undefined) return 'Line pending'
  const x=Number(n)
  if(x===0) return 'PK'
  return x>0?`+${x}`:`${x}`
}

export default async function Dashboard(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const commissioner=profile?.role==='commissioner'

  const {data:squad}=await supabase.from('squads')
    .select('id,squad_name,division,nfl_team_id,nfl_teams(name,abbreviation)')
    .eq('user_id',user.id).eq('season_year',2026).maybeSingle()

  let game:any=null,pick:any=null,week=1
  if(squad){
    const {data:games}=await supabase.from('games')
      .select('id,nfl_week,kickoff_time,spread,total,status,home_team_id,away_team_id,home_score,away_score,home:nfl_teams!games_home_team_id_fkey(name,abbreviation),away:nfl_teams!games_away_team_id_fkey(name,abbreviation)')
      .eq('season_year',2026)
      .or(`home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`)
      .gte('kickoff_time',new Date(Date.now()-6*3600000).toISOString())
      .order('kickoff_time',{ascending:true}).limit(1)
    game=games?.[0]||null
    if(game){
      week=game.nfl_week
      const {data:p}=await supabase.from('picks')
        .select('selection_team_id,result,ats_margin,is_locked,revealed')
        .eq('squad_id',squad.id).eq('game_id',game.id).maybeSingle()
      pick=p
    }
  }

  const {data:statusRows}=await supabase.rpc('league_pick_status',{p_season:2026,p_week:week})
  const submitted=(statusRows||[]).filter((r:any)=>r.submitted).length

  const {data:divisionNameRow}=squad ? await supabase.from('division_names').select('division_name').eq('season_year',2026).eq('division',squad.division).maybeSingle() : {data:null}
  const divisionTitle=divisionNameRow?.division_name || (squad?`Division ${squad.division}`:'')

  const {data:standings}=await supabase.from('standings')
    .select('wins,losses,pushes,ats_margin,squads!inner(id,squad_name,division)')
    .eq('season_year',2026)
  const divRows=(standings||[]).filter((r:any)=>r.squads?.division===squad?.division)
    .sort((a:any,b:any)=>(b.wins-a.wins)||(Number(b.ats_margin)-Number(a.ats_margin)))

  const homeSpread=game?.spread===null||game?.spread===undefined?null:Number(game.spread)
  const awaySpread=homeSpread===null?null:-homeSpread
  const ownSpread=game && squad?.nfl_team_id===game.home_team_id?homeSpread:awaySpread

  return <main className="wrap">
    <div className="top"><div><div className="big">NFL SQUADS</div><div className="muted">2026 Season</div></div></div>
    <Nav commissioner={commissioner}/>

    {commissioner && <section className="card">
      <h2>Commissioner</h2>
      <p><a href="/commissioner/setup"><b>League Setup</b></a> · <a href="/commissioner/live-feed"><b>Live Feed</b></a> · <a href="/commissioner/results"><b>Lines & Results</b></a></p>
    </section>}

    <div className="grid">
      <section className="card">
        <h2>My Squad</h2>
        <p className="big">{squad?.squad_name||'Not assigned yet'}</p>
        <p>{(squad as any)?.nfl_teams?.name||''}</p>
        <p className="muted">{squad?`Division ${squad.division}`:'Commissioner setup pending'}</p>
      </section>

      <section className="card">
        <h2>{game?`Week ${game.nfl_week} NFL Game`:'My Matchup'}</h2>
        {game?<>
          <p><b>{game.away?.name}</b> at <b>{game.home?.name}</b></p>
          <p><b>Your line:</b> {fmtSpread(ownSpread)}</p>
          <p><b>Game total:</b> {game.total ?? 'Pending'}</p>
<p><b>Kickoff:</b> {new Date(game.kickoff_time).toLocaleString('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})}</p>
<p><b>Status:</b> {game.status}</p>
          <p><b>Status:</b> {game.status}</p>
        </>:<p className="muted">No upcoming game found.</p>}
      </section>

      <section className="card">
        <h2>My Pick</h2>
        <p className="big">{pick?'Submitted':'Not submitted'}</p>
        <p className="muted">{pick?.is_locked?'Locked':game?'Editable until one minute before kickoff':''}</p>
        <p><a href="/my-pick"><b>{pick?'Review / Update Pick →':'Make My Pick →'}</b></a></p>
      </section>
    </div>

    <div className="grid">
      <section className="card">
        <h2>{divisionTitle}</h2>
        {divRows.length===0?<p className="muted">Standings will appear after grading.</p>:
        divRows.map((r:any,i:number)=><p key={r.squads.id}><b>{i+1}. {r.squads.squad_name}</b> — {r.wins}-{r.losses}-{r.pushes} · ATS {Number(r.ats_margin)>0?'+':''}{r.ats_margin}</p>)}
      </section>

      <section className="card">
        <h2>League Pick Status — Week {week}</h2>
        <p className="big">{submitted}/16 submitted</p>
        <p className="muted">Before kickoff, owners see only whether a pick is in — never the actual selection.</p>
        <p>{(statusRows||[]).map((r:any)=>`${r.squad_name}: ${r.submitted?'✓':'—'}`).join(' · ')}</p>
      </section>
    </div>
  </main>
}
