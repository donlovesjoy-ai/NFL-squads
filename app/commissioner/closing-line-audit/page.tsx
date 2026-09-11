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
  const retainedSnapshots=(snapshots||[]) as any[]
  const officialSnapshot=retainedSnapshots.find(s=>Number(s.id)===Number(selected?.closing_snapshot_id))
  const bestRetainedSnapshot=officialSnapshot || retainedSnapshots[0] || null
  const displaySpread=closingVerified ? selected?.closing_spread : bestRetainedSnapshot?.home_spread
  const displayTotal=closingVerified ? selected?.closing_total : bestRetainedSnapshot?.total
  const displayBook=closingVerified
    ? (selected?.closing_bookmaker||selected?.odds_bookmaker)
    : (bestRetainedSnapshot?.bookmaker_key||selected?.odds_bookmaker)
  const displayBookUpdated=closingVerified
    ? selected?.closing_bookmaker_updated_at
    : bestRetainedSnapshot?.bookmaker_last_update
  const displayReceived=closingVerified
    ? selected?.closing_received_at
    : bestRetainedSnapshot?.observed_at

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
              <div><b>Finalized</b><br/>{fmtEastern(selected.closing_finalized_at)}</div>
              <div><b>Finalize reason</b><br/>{selected.closing_finalize_reason||'—'}</div>
              <div><b>Snapshot ID</b><br/>{selected.closing_snapshot_id ?? bestRetainedSnapshot?.id ?? '—'}</div>
            </div>

            <p className="status" style={{marginBottom:0,textAlign:'center'}}>
              {closingVerified
                ? 'VERIFIED — official closing line is tied to a retained BetMGM snapshot.'
                : bestRetainedSnapshot
                  ? 'UNVERIFIED — official closing fields were not finalized for this game. The values above are the best retained snapshot and are shown for audit reference only.'
                  : 'NOT YET VERIFIED — no finalized retained closing snapshot is attached to this game.'}
            </p>

            {selected.closing_snapshot_hash && (
              <p className="muted" style={{fontSize:'0.72rem',wordBreak:'break-all',textAlign:'center'}}>
                Snapshot SHA-256: {selected.closing_snapshot_hash}
              </p>
            )}
          </section>

          <section className="card" style={{maxWidth:980,margin:'0 auto 16px'}}>
            <h2 style={{textAlign:'center',marginTop:0}}>BetMGM Snapshot Timeline</h2>

            {!retainedSnapshots.length ? (
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
                    {retainedSnapshots.map((s:any)=>{
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

      <section className="card" style={{maxWidth:980,margin:'0 auto 16px'}}>
        <h2 style={{textAlign:'center',marginTop:0}}>Games by Week</h2>
        <div style={{display:'grid',gap:18}}>
          {weeks.map(week=>{
            const weekGames=rows.filter(g=>Number(g.nfl_week)===week)
            return (
              <div key={week}>
                <h3 style={{margin:'0 0 10px',fontSize:'1rem',textAlign:'left'}}>Week {week}</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
                  {weekGames.map((g:any)=>{
                    const isSelected=Number(g.id)===Number(selected?.id)
                    const gameVerified=Boolean(g.closing_finalized_at && g.closing_snapshot_id)
                    return (
                      <a
                        key={g.id}
                        href={`/commissioner/closing-line-audit?game=${g.id}`}
                        className="submit"
                        style={{
                          textDecoration:'none',
                          padding:'10px 12px',
                          textAlign:'left',
                          outline:isSelected ? '3px solid #777' : 'none',
                          outlineOffset:2
                        }}
                      >
                        <div>{g.away?.abbreviation} @ {g.home?.abbreviation}</div>
                        <div style={{fontSize:'0.72rem',opacity:0.78,marginTop:3}}>
                          {gameVerified ? `Closing: ${fmtLine(g.closing_spread)} / ${g.closing_total ?? '—'}` : 'Tap to view audit'}
                        </div>
                      </a>
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
