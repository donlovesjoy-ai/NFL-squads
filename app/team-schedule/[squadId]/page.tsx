import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { Nav } from '../../components'

const TZ='America/New_York'
function fmt(value:string){return new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value))}
function spreadForTeam(game:any,teamId:number){if(game.home_spread==null)return '—';const n=Number(game.home_spread);const v=game.home_team_id===teamId?n:-n;return `${v>0?'+':''}${v}`}
function statusStyle(result?:string,forced=false){if(forced||result==='loss')return {borderColor:'#ef4444',background:'#fee2e2'};if(result==='win')return {borderColor:'#22c55e',background:'#dcfce7'};if(result==='push')return {borderColor:'#f59e0b',background:'#fef3c7'};return {borderColor:'#cbd5e1',background:'#e5e7eb'}}

export default async function TeamSchedulePage({params}:{params:Promise<{squadId:string}>}){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')
  const {squadId}=await params
  const id=Number(squadId)
  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const {data:squad}=await supabase.from('squads').select('id,squad_name,owner_name,nba_team_id,nba_teams(name,abbreviation)').eq('id',id).eq('season_year',2026).maybeSingle()
  if(!squad)redirect('/schedule')
  const team:any=Array.isArray((squad as any).nba_teams)?(squad as any).nba_teams[0]:(squad as any).nba_teams
  const {data:teams}=await supabase.from('nba_teams').select('id,name,abbreviation')
  const teamMap=new Map((teams||[]).map((t:any)=>[t.id,t]))
  const {data:games}=await supabase.from('games').select('id,home_team_id,away_team_id,scheduled_tipoff_time,status,home_score,away_score,home_spread,closing_spread').eq('season_year',2026).or(`home_team_id.eq.${squad.nba_team_id},away_team_id.eq.${squad.nba_team_id}`).order('scheduled_tipoff_time')
  const rows=(games||[]) as any[]
  const gameIds=rows.map(g=>g.id)
  const {data:picks}=gameIds.length?await supabase.from('picks').select('game_id,selection_team_id,result,ats_margin').eq('squad_id',squad.id).in('game_id',gameIds):{data:[] as any[]}
  const {data:forced}=gameIds.length?await supabase.from('forced_losses').select('game_id,reason').eq('squad_id',squad.id).in('game_id',gameIds):{data:[] as any[]}
  const pickMap=new Map((picks||[]).map((p:any)=>[p.game_id,p]))
  const forcedMap=new Map((forced||[]).map((f:any)=>[f.game_id,f]))

  return <main style={{maxWidth:1050,margin:'0 auto',padding:'28px 14px 60px'}}>
    <h1 style={{textAlign:'center',marginBottom:6}}>{team?.name} Schedule</h1>
    <div style={{textAlign:'center',fontWeight:800,opacity:.72}}>{squad.squad_name} · 2026–27</div>
    <Nav commissioner={profile?.role==='commissioner'}/>
    <div style={{display:'flex',justifyContent:'center',gap:18,margin:'8px 0 22px'}}><Link href={`/schedule?squad=${squad.id}`} style={{textDecoration:'underline',fontWeight:800}}>Back to calendar</Link><span>All times Eastern</span></div>

    {!rows.length?<div className="card" style={{textAlign:'center'}}>The 2026–27 NBA schedule has not been loaded yet.</div>:<div style={{display:'grid',gap:9}}>
      {rows.map((g:any,index:number)=>{
        const home=g.home_team_id===squad.nba_team_id
        const opponentId=home?g.away_team_id:g.home_team_id
        const opp:any=teamMap.get(opponentId)
        const pick:any=pickMap.get(g.id)
        const miss=forcedMap.has(g.id)
        const selection:any=pick?teamMap.get(pick.selection_team_id):null
        const style=statusStyle(pick?.result,miss)
        return <details key={g.id} style={{...style,border:'2px solid',borderColor:style.borderColor,borderRadius:11,padding:'0 14px'}}>
          <summary style={{cursor:'pointer',listStyle:'none',display:'grid',gridTemplateColumns:'42px 155px 1fr 95px 95px',gap:10,alignItems:'center',padding:'13px 0'}}>
            <div style={{fontWeight:900,textAlign:'center'}}>{index+1}</div>
            <div style={{fontSize:14}}>{fmt(g.scheduled_tipoff_time)}</div>
            <div style={{fontSize:18,fontWeight:900}}>{home?'vs':'@'} {opp?.abbreviation||opp?.name||'TBD'}</div>
            <div style={{textAlign:'center',fontWeight:800}}>{miss?'AUTO L':pick?.result?String(pick.result).toUpperCase():'NO PICK'}</div>
            <div style={{textAlign:'right',fontWeight:900}}>{g.status==='final'?`${g.away_score}–${g.home_score}`:g.status}</div>
          </summary>
          <div style={{borderTop:'1px solid rgba(0,0,0,.16)',padding:'12px 0 14px',display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>
            <div><div style={{fontSize:12,opacity:.62}}>FINAL SCORE</div><b>{g.status==='final'?`${g.away_score}–${g.home_score}`:'—'}</b></div>
            <div><div style={{fontSize:12,opacity:.62}}>SELECTION</div><b>{miss?'Missed required game':selection?.abbreviation||'No pick'}</b></div>
            <div><div style={{fontSize:12,opacity:.62}}>SPREAD</div><b>{spreadForTeam(g,squad.nba_team_id)}</b></div>
            <div><div style={{fontSize:12,opacity:.62}}>ATS RESULT</div><b>{miss?'LOSS':pick?.result?String(pick.result).toUpperCase():'—'}</b>{pick?.ats_margin!=null&&<span> ({Number(pick.ats_margin)>0?'+':''}{pick.ats_margin})</span>}</div>
          </div>
        </details>
      })}
    </div>}
    <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center',marginTop:20,fontSize:13,fontWeight:700}}><span>🟩 ATS win</span><span>🟥 ATS loss / automatic loss</span><span>🟨 Push</span><span>⬜ No pick</span></div>
  </main>
}
