import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'

function formatEastern(value:string){
  return new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',
    weekday:'short',
    month:'short',
    day:'numeric',
    hour:'numeric',
    minute:'2-digit',
    second:'2-digit'
  })
}

function dateKeyEastern(value:string){
  return new Date(value).toLocaleDateString('en-CA',{
    timeZone:'America/New_York'
  })
}

function dateLabelEastern(value:string){
  return new Date(value).toLocaleDateString('en-US',{
    timeZone:'America/New_York',
    weekday:'long',
    month:'long',
    day:'numeric',
    year:'numeric'
  })
}

export default async function LoginLogPage(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  if(profile?.role!=='commissioner'){
    redirect('/dashboard')
  }

  const {data:logs}=await supabase
    .from('login_activity_log')
    .select('id,user_id,logged_in_at,source,historical_backfill,visit_hour')
    .or('source.eq.visit,historical_backfill.eq.true')
    .order('logged_in_at',{ascending:false})
    .limit(1000)

  const userIds=[...new Set((logs||[]).map((row:any)=>row.user_id))]

  let users:any[]=[]
  let squads:any[]=[]

  if(userIds.length){
    const [{data:userRows},{data:squadRows}]=await Promise.all([
      supabase
        .from('users')
        .select('id,email')
        .in('id',userIds),
      supabase
        .from('squads')
        .select('user_id,owner_name,squad_name')
        .eq('season_year',2026)
        .in('user_id',userIds)
    ])

    users=userRows||[]
    squads=squadRows||[]
  }

  const userById=new Map(users.map((row:any)=>[row.id,row]))
  const squadByUserId=new Map(squads.map((row:any)=>[row.user_id,row]))

  const groups=new Map<string,any[]>()

  for(const row of logs||[]){
    const key=dateKeyEastern(row.logged_in_at)
    const current=groups.get(key)||[]
    current.push(row)
    groups.set(key,current)
  }

  return (
    <main className="wrap">
      <div className="top" style={{justifyContent:'center',textAlign:'center'}}>
        <div style={{width:'100%'}}>
          <div className="big">NFL SQUADS</div>
          <div className="muted">Owner Activity</div>
        </div>
      </div>

      <Nav commissioner={true}/>

      <section className="card" style={{maxWidth:900,margin:'0 auto'}}>
        <h1 style={{textAlign:'center'}}>Activity Log</h1>

        <p className="muted" style={{textAlign:'center',fontSize:'0.82rem'}}>
          One authenticated NFL Squads visit is recorded per owner per hour and grouped by day in Eastern time.
        </p>

        <p className="muted" style={{textAlign:'center',fontSize:'0.78rem'}}>
          Historical entries from before hourly visit tracking was installed represent each account&apos;s most recent Supabase sign-in since Monday, September 7, 2026.
        </p>

        {groups.size===0 ? (
          <p className="muted" style={{textAlign:'center'}}>No owner activity recorded yet.</p>
        ) : (
          [...groups.entries()].map(([key,rows])=>(
            <div key={key} style={{marginTop:24}}>
              <h2 style={{textAlign:'center',marginBottom:10}}>
                {dateLabelEastern(rows[0].logged_in_at)}
              </h2>

              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',textAlign:'center'}}>
                  <thead>
                    <tr>
                      <th style={{padding:'8px 6px'}}>Owner</th>
                      <th style={{padding:'8px 6px'}}>Squad</th>
                      <th style={{padding:'8px 6px'}}>Visit Time</th>
                      <th style={{padding:'8px 6px'}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row:any)=>{
                      const account=userById.get(row.user_id)
                      const squad=squadByUserId.get(row.user_id)

                      return (
                        <tr key={row.id}>
                          <td style={{padding:'8px 6px',borderTop:'1px solid #e5e5e5'}}>
                            <div style={{fontWeight:800}}>{squad?.owner_name || 'Unassigned'}</div>
                            <div className="muted" style={{fontSize:'0.72rem'}}>{account?.email || 'Unknown account'}</div>
                          </td>
                          <td style={{padding:'8px 6px',borderTop:'1px solid #e5e5e5'}}>
                            {squad?.squad_name || '—'}
                          </td>
                          <td style={{padding:'8px 6px',borderTop:'1px solid #e5e5e5',whiteSpace:'nowrap'}}>
                            {formatEastern(row.logged_in_at)}
                          </td>
                          <td style={{padding:'8px 6px',borderTop:'1px solid #e5e5e5'}}>
                            {row.historical_backfill ? 'Historical' : 'Hourly Visit'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  )
}
