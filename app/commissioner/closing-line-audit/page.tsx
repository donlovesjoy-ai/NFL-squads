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
    .order('nfl_week',{ascending:true})
    .order('scheduled_kickoff_time',{ascending:true})

  const rows=(games||[]) as any[]
  const requestedId=Number(sp.game)
  const gameIds=rows.map(g=>g.id)

  const {data:allSnapshots}=gameIds.length
    ? await supabase
        .from('nfl_odds_snapshots')
        .select('id,game_id,bookmaker_key,bookmaker_last_update,observed_at,provider_commence_time,home_spread,total,market_state,source,snapshot_hash')
        .in('game_id',gameIds)
        .order('observed_at',{ascending:false})
    : {data:[] as any[]}

  const snapshotsByGame=new Map<number,any[]>()
  for(const snapshot of (allSnapshots||[]) as any[]){
    const gameId=Number(snapshot.game_id)
    const existing=snapshotsByGame.get(gameId)||[]
    existing.push(snapshot)
    snapshotsByGame.set(gameId,existing)
  }

  const weeks=Array.from(new Set(rows.map(g=>Number(g.nfl_week)).filter(Number.isFinite))).sort((a,b)=>a-b)

  return (
    <main className="wrap">
      <Nav commissioner={true}/>
      <h1 style={{textAlign:'center'}}>Closing Line Audit</h1>

      <section className="card" style={{maxWidth:980,margin:'0 auto 16px'}}>
        <p className="muted" style={{textAlign:'center',margin:0}}>
          Scheduled kickoff controls the pick lock. Provider kickoff times are retained only as audit evidence and never move the deadline.
        </p>
      </section>

      <section className="card" style={{maxWidth:980,margin:'0 auto 16px'}}>
        <div style={{display:'grid',gap:22}}>
          {weeks.map(week=>{
            const weekGames=rows.filter(g=>Number(g.nfl_week)===week)

            return (
              <div key={week}>
                <h2 style={{margin:'0 0 10px',fontSize:'1.1rem'}}>Week {week}</h2>

                <div style={{display:'grid',gap:10}}>
                  {weekGames.map((game:any)=>{
                    const scheduled=game.scheduled_kickoff_time||game.kickoff_time
                    const retainedSnapshots=snapshotsByGame.get(Number(game.id))||[]
                    const closingVerified=Boolean(game.closing_finalized_at && game.closing_snapshot_id)
                    const officialSnapshot=retainedSnapshots.find(
                      (snapshot:any)=>Number(snapshot.id)===Number(game.closing_snapshot_id)
                    )
                    const bestRetainedSnapshot=officialSnapshot||retainedSnapshots[0]||null
                    const displaySpread=closingVerified ? game.closing_spread : bestRetainedSnapshot?.home_spread
                    const displayTotal=closingVerified ? game.closing_total : bestRetainedSnapshot?.total
                    const displayBook=closingVerified
                      ? (game.closing_bookmaker||game.odds_bookmaker)
                      : (bestRetainedSnapshot?.bookmaker_key||game.odds_bookmaker)
                    const displayBookUpdated=closingVerified
                      ? game.closing_bookmaker_updated_at
                      : bestRetainedSnapshot?.bookmaker_last_update
                    const displayReceived=closingVerified
                      ? game.closing_received_at
                      : bestRetainedSnapshot?.observed_at
                    const shouldOpen=Number.isFinite(requestedId) && Number(game.id)===requestedId

                    return (
                      <details
                        key={game.id}
                        open={shouldOpen}
                        style={{
                          border:'1px solid #d8d8d8',
                          borderRadius:12,
                          background:'#fff',
                          overflow:'hidden'
                        }}
                      >
                        <summary
                          style={{
                            cursor:'pointer',
                            padding:'14px 16px',
                            fontWeight:700,
                            listStylePosition:'inside'
                          }}
                        >
                          <span style={{marginLeft:6}}>
                            {game.away?.abbreviation} @ {game.home?.abbreviation}
                          </span>
                          <span
                            className="muted"
                            style={{fontWeight:400,fontSize:'0.78rem',marginLeft:10}}
                          >
                            {closingVerified
                              ? `Closing ${fmtLine(game.closing_spread)} / ${game.closing_total ?? '—'}`
                              : bestRetainedSnapshot
                                ? `Retained ${fmtLine(bestRetainedSnapshot.home_spread)} / ${bestRetainedSnapshot.total ?? '—'}`
                                : 'No closing snapshot yet'}
                          </span>
                        </summary>

                        <div style={{borderTop:'1px solid #e2e2e2',padding:'16px'}}>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
                            <div><b>Scheduled kickoff</b><br/>{fmtEastern(scheduled)}</div>
                            <div><b>Pick lock</b><br/>{fmtEastern(game.pick_lock_at)}</div>
                            <div><b>Actual start detected</b><br/>{fmtEastern(game.actual_start_at)}</div>
                            <div><b>Status</b><br/>{String(game.status||'scheduled')}</div>
                            <div>
                              <b>{closingVerified ? 'Official closing spread' : 'Best retained spread'}</b><br/>
                              {fmtLine(displaySpread)}
                            </div>
                            <div>
                              <b>{closingVerified ? 'Official closing total' : 'Best retained total'}</b><br/>
                              {displayTotal ?? '—'}
                            </div>
                            <div><b>Book</b><br/>{displayBook||'—'}</div>
                            <div><b>Bookmaker last update</b><br/>{fmtEastern(displayBookUpdated)}</div>
                            <div><b>NFL Squads received</b><br/>{fmtEastern(displayReceived)}</div>
                            <div><b>Finalized</b><br/>{fmtEastern(game.closing_finalized_at)}</div>
                            <div><b>Finalize reason</b><br/>{game.closing_finalize_reason||'—'}</div>
                            <div><b>Snapshot ID</b><br/>{game.closing_snapshot_id ?? bestRetainedSnapshot?.id ?? '—'}</div>
                          </div>

                          <p className="status" style={{marginBottom:0,textAlign:'center'}}>
                            {closingVerified
                              ? 'VERIFIED — official closing line is tied to a retained BetMGM snapshot.'
                              : bestRetainedSnapshot
                                ? 'UNVERIFIED — official closing fields were not finalized for this game. The values above are the best retained snapshot and are shown for audit reference only.'
                                : 'NOT YET VERIFIED — no finalized retained closing snapshot is attached to this game.'}
                          </p>

                          {game.closing_snapshot_hash && (
                            <p className="muted" style={{fontSize:'0.72rem',wordBreak:'break-all',textAlign:'center'}}>
                              Snapshot SHA-256: {game.closing_snapshot_hash}
                            </p>
                          )}

                          <h3 style={{textAlign:'center',margin:'22px 0 10px'}}>BetMGM Snapshot Timeline</h3>

                          {!retainedSnapshots.length ? (
                            <p className="muted" style={{textAlign:'center',marginBottom:0}}>
                              No retained snapshots for this game yet.
                            </p>
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
                                  {retainedSnapshots.map((snapshot:any)=>{
                                    const providerDrift=scheduled && snapshot.provider_commence_time
                                      ? new Date(snapshot.provider_commence_time).getTime()!==new Date(scheduled).getTime()
                                      : false

                                    return (
                                      <tr key={snapshot.id} style={{borderTop:'1px solid #ddd'}}>
                                        <td style={{padding:8}}>{fmtEastern(snapshot.observed_at)}</td>
                                        <td style={{padding:8}}>{fmtEastern(snapshot.bookmaker_last_update)}</td>
                                        <td style={{padding:8}}>
                                          {fmtEastern(snapshot.provider_commence_time)}
                                          {providerDrift ? ' ⚠ drift' : ''}
                                        </td>
                                        <td style={{padding:8,textAlign:'right'}}>{fmtLine(snapshot.home_spread)}</td>
                                        <td style={{padding:8,textAlign:'right'}}>{snapshot.total ?? '—'}</td>
                                        <td style={{padding:8}}>{snapshot.market_state}</td>
                                        <td style={{padding:8}}>
                                          {Number(snapshot.id)===Number(game.closing_snapshot_id) ? 'YES' : ''}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </details>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
