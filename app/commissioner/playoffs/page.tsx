import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'
import { initialize,grade16,build17,grade17,build18,grade18,finalize } from './actions'

export default async function CommissionerPlayoffs({searchParams}:{searchParams:Promise<{ok?:string,error?:string}>}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')
  const {data:p}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  if(p?.role!=='commissioner') redirect('/dashboard')

  const {data:matches}=await supabase.from('playoff_matchups')
    .select('id,nfl_week,bracket_band,matchup_slot,status,squad_a:squads!playoff_matchups_squad_a_id_fkey(squad_name),squad_b:squads!playoff_matchups_squad_b_id_fkey(squad_name),winner:squads!playoff_matchups_winner_squad_id_fkey(squad_name)')
    .eq('season_year',2026).order('nfl_week').order('bracket_band').order('matchup_slot')

  const count=(w:number,status?:string)=> (matches||[]).filter((m:any)=>m.nfl_week===w && (!status||m.status===status)).length

  return <main className="wrap">
    <div className="top"><div><div className="big">NFL SQUADS</div><div className="muted">Playoff Control</div></div></div>
    <Nav commissioner/>
    {sp.ok&&<p className="status">Action completed: {sp.ok}</p>}
    {sp.error&&<p className="status">Unable to complete: {sp.error}. Check that the previous round is fully graded.</p>}

    <section className="card">
      <h2>Week 16 — Divisional Round</h2>
      <p>#1 vs #2 and #3 vs #4 in every division.</p>
      <p className="muted">Initialize only after Week 15 standings are final.</p>
      <form action={initialize}><button className="submit">Initialize Week 16 Bracket</button></form>
      <form action={grade16}><button className="submit">Grade Week 16 Matchups</button></form>
      <p>{count(16)} matchups • {count(16,'final')} final • {count(16,'needs_tiebreaker')} need tiebreaker</p>
    </section>

    <section className="card">
      <h2>Week 17 — Four Placement Brackets</h2>
      <p>Places 1–4, 5–8, 9–12 and 13–16. Every bracket uses Division 1 vs 2 and Division 3 vs 4.</p>
      <form action={build17}><button className="submit">Build Week 17</button></form>
      <form action={grade17}><button className="submit">Grade Week 17 Matchups</button></form>
      <p>{count(17)} matchups • {count(17,'final')} final • {count(17,'needs_tiebreaker')} need tiebreaker</p>
    </section>

    <section className="card">
      <h2>Week 18 — Final Placement</h2>
      <p>Creates the games that decide exact finishing positions 1 through 16.</p>
      <form action={build18}><button className="submit">Build Week 18</button></form>
      <form action={grade18}><button className="submit">Grade Week 18 Matchups</button></form>
      <form action={finalize}><button className="submit">Finalize 1–16 Placements & Payouts</button></form>
      <p>{count(18)} matchups • {count(18,'final')} final • {count(18,'needs_tiebreaker')} need tiebreaker</p>
    </section>

    <section className="card">
      <h2>Current Matchups</h2>
      {(matches||[]).length===0?<p className="muted">No playoff bracket yet.</p>:
      <table><thead><tr><th>Week</th><th>Band</th><th>Matchup</th><th>Status</th><th>Winner</th></tr></thead>
      <tbody>{(matches||[]).map((m:any)=><tr key={m.id}>
        <td>{m.nfl_week}</td><td>{m.bracket_band}</td>
        <td>{m.squad_a?.squad_name||'TBD'} vs {m.squad_b?.squad_name||'TBD'}</td>
        <td>{m.status}</td><td>{m.winner?.squad_name||''}</td>
      </tr>)}</tbody></table>}
    </section>
  </main>
}
