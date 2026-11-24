import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'

function eastern(value:string|null|undefined){
  if(!value)return '—'
  return new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',
    hour:'numeric',minute:'2-digit',timeZoneName:'short'
  })
}

function direction(before:string|null,after:string|null){
  if(!before||!after)return 'Changed'
  const difference=new Date(after).getTime()-new Date(before).getTime()
  if(difference>0)return 'Moved later'
  if(difference<0)return 'Moved earlier'
  return 'Deadline adjusted'
}

export default async function ScheduleChanges(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')

  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  if(profile?.role!=='commissioner')redirect('/dashboard')

  const {data:changes,error}=await supabase.from('nfl_schedule_change_history')
    .select('id,game_id,season_year,nfl_week,changed_at,old_kickoff_at,new_kickoff_at,old_pick_lock_at,new_pick_lock_at,change_source,notes')
    .order('changed_at',{ascending:false}).order('id',{ascending:false}).limit(250)

  const {data:games}=await supabase.from('games')
    .select('id,status,actual_start_at,home_team_id,away_team_id,nfl_week,season_year')
    .eq('season_year',2026)
  const {data:teams}=await supabase.from('nfl_teams').select('id,name,abbreviation')
  const gameById=new Map((games||[]).map((g:any)=>[Number(g.id),g]))
  const teamById=new Map((teams||[]).map((t:any)=>[Number(t.id),t]))
  const rows=(changes||[]) as any[]

  return (
    <main className="wrap">
      <Nav commissioner={true}/>
      <div style={{maxWidth:980,margin:'24px auto'}}>
        <Link href="/commissioner" style={{display:'inline-block',marginBottom:14}}>← Commissioner Shit</Link>
        <h1 style={{textAlign:'center',margin:'0 0 8px'}}>Schedule Changes</h1>
        <p className="muted" style={{textAlign:'center',marginBottom:20}}>
          Permanent audit of NFL kickoff and pick-deadline changes. All times Eastern.
          New changes are recorded automatically, including commissioner edits.
        </p>

        {error ? (
          <section className="card" role="alert">
            Could not load the schedule history: {error.message}
          </section>
        ) : rows.length===0 ? (
          <section className="card" style={{textAlign:'center'}}>
            No schedule changes have been recorded yet.
          </section>
        ) : (
          <>
            <section className="card" style={{textAlign:'center',marginBottom:16}}>
              <b>{rows.length} recorded change{rows.length===1?'':'s'}</b>
              <div className="muted" style={{fontSize:12,marginTop:6}}>
                Showing the latest 250 entries. Verified November 24 changes were added from the earlier repair.
              </div>
            </section>

            <div style={{display:'grid',gap:12}}>
              {rows.map((change:any)=>{
                const game:any=gameById.get(Number(change.game_id))
                const away:any=game ? teamById.get(Number(game.away_team_id)):null
                const home:any=game ? teamById.get(Number(game.home_team_id)):null
                const kickoffChanged=change.old_kickoff_at!==change.new_kickoff_at
                const oldLock=new Date(change.old_pick_lock_at||0).getTime()
                const newLock=new Date(change.new_pick_lock_at||0).getTime()
                const lockChanged=oldLock!==newLock
                const needsReview=game && (game.actual_start_at || ['live','final'].includes(String(game.status||'').toLowerCase()))
                  && new Date(change.changed_at).getTime()>oldLock
                  && !lockChanged && kickoffChanged
                return (
                  <article key={change.id} className="card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:12,flexWrap:'wrap'}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:'1.08rem'}}>
                          {away?.name||'Away Team'} at {home?.name||'Home Team'}
                        </div>
                        <div className="muted" style={{fontSize:12}}>
                          {change.season_year} · Week {change.nfl_week??game?.nfl_week??'—'} · Game #{change.game_id}
                        </div>
                      </div>
                      <div style={{fontWeight:800,color:needsReview?'#b91c1c':'#111'}}>
                        {needsReview?'Review past deadline':direction(change.old_kickoff_at,change.new_kickoff_at)}
                      </div>
                    </div>
                    <div className="muted" style={{fontSize:12,marginTop:8}}>
                      Detected: {eastern(change.changed_at)}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(235px,1fr))',gap:12,marginTop:14}}>
                      <div style={{padding:12,border:'1px solid #ddd',borderRadius:10}}>
                        <b>Previous scheduled kickoff</b>
                        <div>{eastern(change.old_kickoff_at)}</div>
                        <div className="muted" style={{fontSize:12,marginTop:8}}>Previous pick lock</div>
                        <div>{eastern(change.old_pick_lock_at)}</div>
                      </div>
                      <div style={{padding:12,border:'1px solid #ddd',borderRadius:10}}>
                        <b>New scheduled kickoff</b>
                        <div>{eastern(change.new_kickoff_at)}</div>
                        <div className="muted" style={{fontSize:12,marginTop:8}}>New pick lock</div>
                        <div>{eastern(change.new_pick_lock_at)}</div>
                      </div>
                    </div>
                    <p className="muted" style={{fontSize:12,margin:'12px 0 0'}}>
                      Deadline: {lockChanged?'Adjusted with this change':'Unchanged'}
                      {' · '}Source: {change.change_source==='verified_backfill'?'Verified historic correction':change.change_source==='commissioner_or_user'?'App edit':'Automatic / administrator'}
                    </p>
                    {change.notes&&<p className="muted" style={{fontSize:12,margin:'6px 0 0'}}>{change.notes}</p>}
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
