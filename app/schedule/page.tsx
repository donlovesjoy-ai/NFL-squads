import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'

const TZ='America/New_York'
const DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT']

function etParts(value:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(value))
  const get=(type:string)=>parts.find(p=>p.type===type)?.value || ''
  return {year:Number(get('year')),month:Number(get('month')),day:Number(get('day')),time:`${get('hour')}:${get('minute')}`}
}

function monthKey(year:number,month:number){return `${year}-${String(month).padStart(2,'0')}`}
function shiftMonth(year:number,month:number,delta:number){const d=new Date(Date.UTC(year,month-1+delta,1));return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1}}
function monthTitle(year:number,month:number){return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)))}
function spreadForTeam(game:any,teamId:number){if(game.home_spread==null)return '—';const n=Number(game.home_spread);const v=game.home_team_id===teamId?n:-n;return `${v>0?'+':''}${v}`}
function resultStyle(result?:string,forced=false){if(forced||result==='loss')return {background:'#fee2e2',borderColor:'#ef4444',color:'#991b1b'};if(result==='win')return {background:'#dcfce7',borderColor:'#22c55e',color:'#166534'};if(result==='push')return {background:'#fef3c7',borderColor:'#f59e0b',color:'#92400e'};return {background:'#e5e7eb',borderColor:'#cbd5e1',color:'#334155'}}

export default async function SchedulePage({searchParams}:{searchParams:Promise<{squad?:string;month?:string}>}){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')
  const p=await searchParams
  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const {data:squads}=await supabase.from('squads').select('id,user_id,squad_name,owner_name,nba_team_id,nba_teams(name,abbreviation,logo_url)').eq('season_year',2026).order('squad_name')
  const list=(squads||[]) as any[]
  const own=list.find(s=>s.user_id===user.id)
  const requested=Number(p.squad)
  const selected=list.find(s=>s.id===requested)||own||list[0]

  const nowEt=etParts(new Date().toISOString())
  const parsed=p.month?.match(/^(\d{4})-(\d{2})$/)
  const year=parsed?Number(parsed[1]):nowEt.year
  const month=parsed?Number(parsed[2]):nowEt.month
  const prev=shiftMonth(year,month,-1),next=shiftMonth(year,month,1)

  if(!selected){
    return <main className="wrap"><h1 style={{textAlign:'center'}}>Schedule</h1><Nav commissioner={profile?.role==='commissioner'}/><div className="card" style={{textAlign:'center'}}>No NBA Squads teams have been assigned yet.</div></main>
  }

  const {data:teams}=await supabase.from('nba_teams').select('id,name,abbreviation,logo_url')
  const teamMap=new Map((teams||[]).map((t:any)=>[t.id,t]))
  const {data:games}=await supabase.from('games').select('id,home_team_id,away_team_id,scheduled_tipoff_time,status,home_score,away_score,home_spread,closing_spread').eq('season_year',2026).or(`home_team_id.eq.${selected.nba_team_id},away_team_id.eq.${selected.nba_team_id}`).order('scheduled_tipoff_time')
  const allGames=(games||[]) as any[]
  const gameIds=allGames.map(g=>g.id)
  const {data:picks}=gameIds.length?await supabase.from('picks').select('game_id,selection_team_id,result,ats_margin').eq('squad_id',selected.id).in('game_id',gameIds):{data:[] as any[]}
  const {data:forced}=gameIds.length?await supabase.from('forced_losses').select('game_id,reason').eq('squad_id',selected.id).in('game_id',gameIds):{data:[] as any[]}
  const pickMap=new Map((picks||[]).map((x:any)=>[x.game_id,x]))
  const forcedMap=new Map((forced||[]).map((x:any)=>[x.game_id,x]))
  const monthGames=allGames.filter(g=>{const d=etParts(g.scheduled_tipoff_time);return d.year===year&&d.month===month})
  const byDay=new Map<number,any[]>()
  monthGames.forEach(g=>{const day=etParts(g.scheduled_tipoff_time).day;byDay.set(day,[...(byDay.get(day)||[]),g])})
  const firstDow=new Date(Date.UTC(year,month-1,1)).getUTCDay()
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate()
  const cells=[...Array(firstDow).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)]
  while(cells.length%7)cells.push(null)
  const nbaTeam:any=Array.isArray(selected.nba_teams)?selected.nba_teams[0]:selected.nba_teams
  const mk=(y:number,m:number)=>`/schedule?squad=${selected.id}&month=${monthKey(y,m)}`

  return <main style={{maxWidth:1120,margin:'0 auto',padding:'28px 8px 60px'}}>
    <h1 style={{textAlign:'center',marginBottom:8}}>Schedule</h1>
    <Nav commissioner={profile?.role==='commissioner'}/>
    <div style={{display:'flex',gap:8,overflowX:'auto',padding:'4px 2px 12px',marginTop:12}}>
      {list.map((s:any)=>{const t:any=Array.isArray(s.nba_teams)?s.nba_teams[0]:s.nba_teams;const active=s.id===selected.id;return <Link key={s.id} href={`/schedule?squad=${s.id}&month=${monthKey(year,month)}`} style={{whiteSpace:'nowrap',padding:'9px 12px',borderRadius:999,border:'1px solid #bbb',background:active?'#111':'#fff',color:active?'#fff':'#111',fontWeight:800}}>{t?.abbreviation||s.squad_name}</Link>})}
    </div>

    <section className="card" style={{padding:10,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'42px 1fr 42px',alignItems:'center',gap:6}}>
        <Link href={mk(prev.year,prev.month)} style={{fontSize:28,textAlign:'center'}}>‹</Link>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:25,fontWeight:900}}>{monthTitle(year,month)}</div>
          <div style={{fontWeight:800,marginTop:3}}>{selected.squad_name} · {nbaTeam?.name}</div>
          <div style={{fontSize:13,opacity:.65,marginTop:3}}>All times Eastern</div>
        </div>
        <Link href={mk(next.year,next.month)} style={{fontSize:28,textAlign:'center'}}>›</Link>
      </div>
      <div style={{textAlign:'center',margin:'12px 0 4px'}}><Link href={`/team-schedule/${selected.id}`} style={{textDecoration:'underline',fontWeight:800}}>View full team schedule</Link></div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',marginTop:16,borderTop:'1px solid #c8c8c8',borderLeft:'1px solid #c8c8c8'}}>
        {DAYS.map(d=><div key={d} style={{padding:'7px 1px',textAlign:'center',fontWeight:900,fontSize:11,borderRight:'1px solid #c8c8c8',borderBottom:'1px solid #c8c8c8',background:'#f3f4f6'}}>{d}</div>)}
        {cells.map((day,index)=>{
          const gamesForDay=day?byDay.get(day)||[]:[]
          return <div key={index} style={{minHeight:92,padding:3,borderRight:'1px solid #c8c8c8',borderBottom:'1px solid #c8c8c8',background:day?'#fff':'#f7f7f7',minWidth:0}}>
            {day&&<div style={{fontSize:11,fontWeight:800,opacity:.55,marginBottom:3}}>{day}</div>}
            {gamesForDay.map((g:any)=>{
              const d=etParts(g.scheduled_tipoff_time),opponentId=g.home_team_id===selected.nba_team_id?g.away_team_id:g.home_team_id,opp:any=teamMap.get(opponentId),home=g.home_team_id===selected.nba_team_id
              const pick:any=pickMap.get(g.id),miss=forcedMap.has(g.id),rs=resultStyle(pick?.result,miss)
              const selection:any=pick?teamMap.get(pick.selection_team_id):null
              return <details key={g.id} style={{...rs,border:'1px solid',borderColor:rs.borderColor,borderRadius:8,padding:4,marginBottom:3,fontSize:10,width:'100%',minWidth:0,boxSizing:'border-box'}}>
                <summary style={{cursor:'pointer',listStyle:'none',textAlign:'center',display:'grid',gap:2,justifyItems:'center'}}>
                  <div style={{fontWeight:900,fontSize:11,lineHeight:1}}>{home?'VS':'@'}</div>
                  <div style={{fontWeight:900,fontSize:13,lineHeight:1.05,whiteSpace:'nowrap'}}>{opp?.abbreviation||'TBD'}</div>
                  {opp?.logo_url&&<img src={opp.logo_url} alt={`${opp.name} logo`} style={{width:27,height:27,objectFit:'contain',display:'block'}}/>}
                  <div style={{fontWeight:800,fontSize:10,lineHeight:1,whiteSpace:'nowrap'}}>{d.time}</div>
                  {pick?.result&&<div style={{fontWeight:900,textTransform:'uppercase',fontSize:9,marginTop:1}}>{pick.result}</div>}
                  {miss&&<div style={{fontWeight:900,fontSize:9,marginTop:1}}>AUTO LOSS</div>}
                </summary>
                <div style={{borderTop:'1px solid rgba(0,0,0,.15)',marginTop:5,paddingTop:5,lineHeight:1.45,fontSize:10}}>
                  <div><b>Final:</b> {g.status==='final'?`${g.away_score}–${g.home_score}`:'—'}</div>
                  <div><b>Selection:</b> {miss?'Missed required game':selection?.abbreviation||'No pick'}</div>
                  <div><b>Spread:</b> {spreadForTeam(g,selected.nba_team_id)}</div>
                  <div><b>ATS:</b> {miss?'Loss':pick?.result?String(pick.result).toUpperCase():'—'}</div>
                  {pick?.ats_margin!=null&&<div><b>ATS margin:</b> {Number(pick.ats_margin)>0?'+':''}{pick.ats_margin}</div>}
                </div>
              </details>
            })}
          </div>
        })}
      </div>
      <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center',marginTop:14,fontSize:13,fontWeight:700}}>
        <span>🟩 ATS win</span><span>🟥 ATS loss / automatic loss</span><span>🟨 Push</span><span>⬜ No pick</span>
      </div>
    </section>
  </main>
}
