import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'

const bands=['1-4','5-8','9-12','13-16']

export default async function Playoffs(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const commissioner=profile?.role==='commissioner'

  const {data:matches}=await supabase.from('playoff_matchups')
    .select('id,nfl_week,bracket_band,round_name,matchup_slot,status,final_place_winner,final_place_loser,squad_a:squads!playoff_matchups_squad_a_id_fkey(squad_name),squad_b:squads!playoff_matchups_squad_b_id_fkey(squad_name),winner:squads!playoff_matchups_winner_squad_id_fkey(squad_name),loser:squads!playoff_matchups_loser_squad_id_fkey(squad_name)')
    .eq('season_year',2026)
    .order('nfl_week').order('bracket_band').order('matchup_slot')

  const {data:placements}=await supabase.from('final_placements')
    .select('final_place,payout,squads(squad_name)')
    .eq('season_year',2026).order('final_place')

  const by=(week:number,band:string)=> (matches||[]).filter((m:any)=>m.nfl_week===week && m.bracket_band===band)

  return <main className="wrap">
    <div className="top">
      <div><div className="big">NFL SQUADS</div><div className="muted">2026 Playoffs</div></div>
    </div>
    <Nav commissioner={commissioner}/>

    {(!matches || matches.length===0) && <div className="card">
      <h2>Playoff bracket not initialized yet</h2>
      <p className="muted">The commissioner will initialize the bracket after Week 15 standings are final.</p>
    </div>}

    {bands.map(band=>{
      const w16=by(16,band), w17=by(17,band), w18=by(18,band)
      return <section className="card" key={band}>
        <h2 style={{textDecoration:'underline'}}>Places {band}</h2>
        <div className="bracket-grid">
          <div>
            <h3>Week 16</h3>
            {w16.length===0?<p className="muted">Awaiting bracket placement</p>:w16.map((m:any)=><BracketBox key={m.id} m={m}/>)}
          </div>
          <div>
            <h3>Week 17</h3>
            {w17.length===0?<p className="muted">Awaiting Week 16</p>:w17.map((m:any)=><BracketBox key={m.id} m={m}/>)}
          </div>
          <div>
            <h3>Week 18</h3>
            {w18.length===0?<p className="muted">Awaiting Week 17</p>:w18.map((m:any)=><BracketBox key={m.id} m={m}/>)}
          </div>
        </div>
      </section>
    })}

    {placements && placements.length>0 && <section className="card">
      <h2>Final Placements & Payouts</h2>
      <table>
        <thead><tr><th>Place</th><th>Squad</th><th>Payout</th></tr></thead>
        <tbody>{placements.map((p:any)=><tr key={p.final_place}>
          <td>{p.final_place}</td><td>{p.squads?.squad_name}</td><td>{Number(p.payout)>0?`+$${Math.abs(Number(p.payout))}`:Number(p.payout)<0?`-$${Math.abs(Number(p.payout))}`:'$0'}</td>
        </tr>)}</tbody>
      </table>
    </section>}
  </main>
}

function BracketBox({m}:{m:any}){
  return <div className="bracket-box">
    <div className={m.winner?.squad_name===m.squad_a?.squad_name?'bracket-winner':''}>{m.squad_a?.squad_name||'TBD'}</div>
    <div className={m.winner?.squad_name===m.squad_b?.squad_name?'bracket-winner':''}>{m.squad_b?.squad_name||'TBD'}</div>
    {m.status==='needs_tiebreaker' && <small>Over/Under tiebreaker required</small>}
    {m.status==='final' && m.final_place_winner && <small>Winner: {m.final_place_winner} • Loser: {m.final_place_loser}</small>}
  </div>
}
