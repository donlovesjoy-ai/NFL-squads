import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import WeekSelector from './week-selector'

function signed(n:any){
  if(n===null || n===undefined) return 'Pending'
  const x=Number(n)
  if(x===0) return 'PK'
  return x>0?`+${x}`:`${x}`
}

function firstName(name:any){
  const text=String(name||'').trim()
  return text ? text.split(/\s+/)[0] : '—'
}

export default async function Schedule({
  searchParams
}:{searchParams:Promise<{week?:string}>}){
  const sp=await searchParams
  const week=Math.min(18,Math.max(1,Number(sp.week||1)))

  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase.from('users')
    .select('role').eq('id',user.id).maybeSingle()
  const commissioner=profile?.role==='commissioner'

  const [{data:squads},{data:games}] = await Promise.all([
    supabase.from('squads')
.select('id,user_id,owner_name,squad_name,nfl_team_id,division,nfl_teams(name,abbreviation)')
      .eq('season_year',2026)
      .order('division').order('squad_name'),
    supabase.from('games')
      .select('id,nfl_week,kickoff_time,spread,total,status,home_score,away_score,home_team_id,away_team_id,home:nfl_teams!games_home_team_id_fkey(name,abbreviation),away:nfl_teams!games_away_team_id_fkey(name,abbreviation)')
      .eq('season_year',2026)
      .eq('nfl_week',week)
      .order('kickoff_time')
  ])
const mySquad = (squads || []).find((s:any) => s.user_id === user.id)
  const squadByNflTeam=new Map<number,any>()
  for(const s of squads||[]){
    squadByNflTeam.set(Number(s.nfl_team_id),s)
  }
const divisionOrder = mySquad
  ? [mySquad.division, ...[1,2,3,4].filter(d => d !== mySquad.division)]
  : [1,2,3,4]

const squadsByDivision = divisionOrder.map(division => ({
  division,
  squads: (squads || [])
    .filter((s:any) => s.division === division)
    .sort((a:any,b:any) => {
      if (a.id === mySquad?.id) return -1
      if (b.id === mySquad?.id) return 1
      return String(a.squad_name).localeCompare(String(b.squad_name))
    })
}))
  const gameForTeam=(teamId:number)=>{
    return (games||[]).find((g:any)=>g.home_team_id===teamId || g.away_team_id===teamId)
  }

  return <main className="wrap">
    <div className="top">
      <div>
        <div className="big">NFL SQUADS</div>
        <div className="muted">2026 Schedule & Results</div>
      </div>
    </div>
    <Nav commissioner={commissioner}/>

    <section className="card">
      <h1>Schedule & Results</h1>
      <p className="muted">
        Select any NFL week to view every league squad's opponent, spread, kickoff and result.
      </p>
      <WeekSelector week={week}/>
    </section>

    <section className="card">
      <h2>Week {week}</h2>
      <div style={{overflowX:'auto'}}>
        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Squad</th>
              <th>Opponent</th>
              <th>Spread</th>
              <th>Kickoff</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
{squadsByDivision.flatMap(({division, squads: divisionSquads}) => [
  <tr key={`division-${division}`}>
    <td colSpan={6}>
      <strong>Division {division}</strong>
    </td>
  </tr>,

  ...divisionSquads.map((s:any) => {
    const g:any = gameForTeam(Number(s.nfl_team_id))

    if(!g){
      return <tr key={s.id}>
        <td>{firstName(s.owner_name)}</td>
       <td>
  <div style={{display:'flex',alignItems:'center',gap:8}}>
    <img
      src={`/helmets/${s.nfl_teams?.abbreviation}.png`}
      alt=""
      width={32}
      height={32}
      style={{objectFit:'contain'}}
    />
    <b>{s.squad_name}</b>
  </div>
</td>
        <td colSpan={4}>No game found</td>
      </tr>
    }

    const isHome = g.home_team_id === s.nfl_team_id
    const opponentTeamId = isHome ? g.away_team_id : g.home_team_id
    const opponentNfl = isHome ? g.away : g.home
    const opponentSquad = squadByNflTeam.get(Number(opponentTeamId))
    const opponentLabel = opponentSquad?.squad_name || opponentNfl?.name || '—'

    const ownedSpread =
      g.spread === null
        ? null
        : (isHome ? Number(g.spread) : -Number(g.spread))

    let result = 'Scheduled'

    if(g.status === 'live'){
      const ownScore = isHome ? g.home_score : g.away_score
      const oppScore = isHome ? g.away_score : g.home_score
      result = `Live ${ownScore ?? 0}-${oppScore ?? 0}`
    }else if(g.status === 'final'){
      const ownScore = isHome ? g.home_score : g.away_score
      const oppScore = isHome ? g.away_score : g.home_score
      const wl = ownScore > oppScore ? 'W' : ownScore < oppScore ? 'L' : 'T'
      result = `${wl} ${ownScore}-${oppScore}`
    }

    return <tr key={s.id}>
      <td>{firstName(s.owner_name)}</td>
     <td>
  <div style={{display:'flex',alignItems:'center',gap:8}}>
    <img
      src={`/helmets/${s.nfl_teams?.abbreviation}.png`}
      alt=""
      width={32}
      height={32}
      style={{objectFit:'contain'}}
    />
    <b>{s.squad_name}</b>
  </div>
</td>
      <td>{isHome ? 'vs ' : '@ '}{opponentLabel}</td>
      <td>{signed(ownedSpread)}</td>
      <td>{new Date(g.kickoff_time).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })}</td>
      <td>{result}</td>
    </tr>
  })
])}
          </tbody>
        </table>
      </div>
    </section>
  </main>
}
