import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'

function fmtEastern(value:string|null|undefined){
  if(!value) return '—'
  return new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',
    month:'short',
    day:'numeric',
    hour:'numeric',
    minute:'2-digit',
    second:'2-digit'
  })
}

function fmtLine(value:any){
  if(value===null || value===undefined) return '—'
  const n=Number(value)
  if(!Number.isFinite(n)) return String(value)
  if(n===0) return 'PK'
  return n>0 ? `+${n}` : `${n}`
}

export default async function ClosingLineAudit({
  searchParams
}:{
  searchParams:Promise<{game?:string}>
}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  if(profile?.role!=='commissioner') redirect('/dashboard')

  const {data:games}=await supabase
    .from('games')
    .select(`
      id,
      nfl_week,
      kickoff_time,
      scheduled_kickoff_time,
      pick_lock_at,
      actual_start_at,
      status,
      spread,
      total,
      odds_bookmaker,
      odds_updated_at,
      closing_spread,
      closing_total,
      closing_bookmaker,
      closing_bookmaker_updated_at,
      closing_received_at,
      closing_finalized_at,
      closing_finalize_reason,
      closing_snapshot_id,
      closing_snapshot_hash,
      home:nfl_teams!games_home_team_id_fkey(name,abbreviation),
      away:nfl_teams!games_away_team_id_fkey(name,abbreviation)
    `)
    .eq('season_year',2026)
    .order('scheduled_kickoff_time',{ascending:true})

  const rows=(games||[]) as any[]
  const requestedId=Number(sp.game)
  const now=Date.now()
  const defaultGame=
    [...rows]
      .filter(g=>new Date(g.scheduled_kickoff_time||g.kickoff_time).getTime()<=now)
      .sort((a,b)=>new Date(b.scheduled_kickoff_time||b.kickoff_time).getTime()-new Date(a.scheduled_kickoff_time||a.kickoff_time).getTime())[0]
    || rows[0]

  const selected=rows.find(g=>Number(g.id)===requestedId) || defaultGame

  const {data:snapshots}=selected
    ? await supabase
        .from('nfl_odds_snapshots')
        .select('id,bookmaker_key,bookmaker_last_update,observed_at,provider_commence_time,home_spread,total,market_state,source,snapshot_hash')
        .eq('game_id',selected.id)
        .order('observed_at',{ascending:false})
    : {data:[] as any[]}

  const selectedScheduled=selected?.scheduled_kickoff_time||selected?.kickoff_time
  const closingVerified=Boolean(selected?.closing_finalized_at && selected?.closing_snapshot_id)

  return (
    <main className="wrap">
      <Nav commissioner={true}/>
      <h1 style={{textAlign:'center'}}>Closing Line Audit</h1>

      <section className="card" style={{maxWidth:980,margin:'0 auto 16px'}}>
        <p className="muted" style={{textAlign:'center',marginTop:0}}>
          Scheduled kickoff controls the pick lock. Provider kickoff times are retained only as audit evidence and never move the deadline.
        </p>

        <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
          {rows.map((g:any)=>(
            <a
              key={g.id}
              href={`/commissioner/closing-line-audit?game=${g.id}`}
              className="submit"
              style={{textDecoration:'none',padding:'8px 10px'}}
            >
              W{g.nfl_week} {g.away?.abbreviation} @ {g.home?.abbreviation}
            </a>
          ))}
        </div>
      </section>

      {selected && (
        <>
          <section className="card" style={{maxWidth:980,margin:'0 auto 16px'}}>
            <h2 style={{textAlign:'center',marginTop:0}}>
              Week {selected.nfl_week}: {selected.away?.name} @ {selected.home?.name}
            </h2>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
              <div><b>Scheduled kickoff</b><br/>{fmtEastern(selectedScheduled)}</div>
              <div><b>Pick lock</b><br/>{fmtEastern(selected.pick_lock_at)}</div>
              <div><b>Actual start detected</b><br/>{fmtEastern(selected.actual_start_at)}</div>
              <div><b>Status</b><br/>{String(selected.status||'scheduled')}</div>
              <div><b>Official closing spread</b><br/>{fmtLine(selected.closing_spread)}</div>
              <div><b>Official closing total</b><br/>{selected.closing_total ?? '—'}</div>
              <div><b>Book</b><br/>{selected.closing_bookmaker||selected.odds_bookmaker||'—'}</div>
              <div><b>Bookmaker last update</b><br/>{fmtEastern(selected.closing_bookmaker_updated_at)}</div>
              <div><b>NFL Squads received</b><br/>{fmtEastern(selected.closing_received_at)}</div>
              <div><b>Finalized</b><br/>{fmtEastern(selected.closing_finalized_at)}</div>
              <div><b>Finalize reason</b><br/>{selected.closing_finalize_reason||'—'}</div>
              <div><b>Snapshot ID</b><br/>{selected.closing_snapshot_id ?? '—'}</div>
            </div>

            <p className="status" style={{marginBottom:0,textAlign:'center'}}>
              {closingVerified
                ? 'VERIFIED — official closing line is tied to a retained BetMGM snapshot.'
                : 'NOT YET VERIFIED — no finalized retained closing snapshot is attached to this game.'}
            </p>

            {selected.closing_snapshot_hash && (
              <p className="muted" style={{fontSize:'0.72rem',wordBreak:'break-all',textAlign:'center'}}>
                Snapshot SHA-256: {selected.closing_snapshot_hash}
              </p>
            )}
          </section>

          <section className="card" style={{maxWidth:980,margin:'0 auto'}}>
            <h2 style={{textAlign:'center',marginTop:0}}>BetMGM Snapshot Timeline</h2>

            {!snapshots?.length ? (
              <p className="muted" style={{textAlign:'center'}}>No retained snapshots for this game yet.</p>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                  <thead>
                    <tr>
                      <th style={{padding:8,textAlign:'left'}}>Observed</th>
                      <th style={{padding:8,textAlign:'left'}}>Book update</th>
                      <th style={{padding:8,textAlign:'left'}}>Provider kickoff</th>
                      <th style={{padding:8,textAlign:'right'}}>Home spread</th>
                      <th style={{padding:8,textAlign:'right'}}>Total</th>
                      <th style={{padding:8,textAlign:'left'}}>State</th>
                      <th style={{padding:8,textAlign:'left'}}>Official</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(snapshots||[]).map((s:any)=>{
                      const providerDrift=selectedScheduled && s.provider_commence_time
                        ? new Date(s.provider_commence_time).getTime()!==new Date(selectedScheduled).getTime()
                        : false
                      return (
                        <tr key={s.id} style={{borderTop:'1px solid #ddd'}}>
                          <td style={{padding:8}}>{fmtEastern(s.observed_at)}</td>
                          <td style={{padding:8}}>{fmtEastern(s.bookmaker_last_update)}</td>
                          <td style={{padding:8}}>
                            {fmtEastern(s.provider_commence_time)}
                            {providerDrift ? ' ⚠ drift' : ''}
                          </td>
                          <td style={{padding:8,textAlign:'right'}}>{fmtLine(s.home_spread)}</td>
                          <td style={{padding:8,textAlign:'right'}}>{s.total ?? '—'}</td>
                          <td style={{padding:8}}>{s.market_state}</td>
                          <td style={{padding:8}}>{Number(s.id)===Number(selected.closing_snapshot_id) ? 'YES' : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
