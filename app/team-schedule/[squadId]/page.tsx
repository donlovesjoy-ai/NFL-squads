import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { Nav } from '../../components'

const TZ='America/New_York'
function dateParts(value:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',month:'numeric',day:'numeric'}).formatToParts(new Date(value))
  const get=(type:string)=>parts.find(p=>p.type===type)?.value || ''
  return {dow:get('weekday').toUpperCase(),date:`${get('month')}/${get('day')}`}
}
function fmtTime(value:string){return new Intl.DateTimeFormat('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value)).replace(/\s?[AP]M$/,'')}
function spreadForTeam(game:any,teamId:number){if(game.home_spread==null)return '—';const n=Number(game.home_spread);const v=game.home_team_id===teamId?n:-n;return `${v>0?'+':''}${v}`}
function statusColor(result?:string,forced=false){if(forced||result==='loss')return '#dc2626';if(result==='win')return '#16a34a';if(result==='push')return '#ca8a04';return '#111827'}

export default async function TeamSchedulePage({params}:{params:Promise<{squadId:string}>}){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')
  const {squadId}=await params
  const id=Number(squadId)
  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const {data:squad}=await supabase.from('squads').select('id,squad_name,owner_name,nba_team_id,nba_teams(name,abbreviation,logo_url)').eq('id',id).eq('season_year',2026).maybeSingle()
  if(!squad)redirect('/schedule')
  const team:any=Array.isArray((squad as any).nba_teams)?(squad as any).nba_teams[0]:(squad as any).nba_teams
  const {data:teams}=await supabase.from('nba_teams').select('id,name,abbreviation,logo_url')
  const teamMap=new Map((teams||[]).map((t:any)=>[t.id,t]))
  const {data:games}=await supabase.from('games').select('id,home_team_id,away_team_id,scheduled_tipoff_time,status,home_score,away_score,home_spread,closing_spread').eq('season_year',2026).or(`home_team_id.eq.${squad.nba_team_id},away_team_id.eq.${squad.nba_team_id}`).order('scheduled_tipoff_time')
  const rows=(games||[]) as any[]
  const gameIds=rows.map(g=>g.id)
  const {data:picks}=gameIds.length?await supabase.from('picks').select('game_id,selection_team_id,result,ats_margin').eq('squad_id',squad.id).in('game_id',gameIds):{data:[] as any[]}
  const {data:forced}=gameIds.length?await supabase.from('forced_losses').select('game_id,reason').eq('squad_id',squad.id).in('game_id',gameIds):{data:[] as any[]}
  const pickMap=new Map((picks||[]).map((p:any)=>[p.game_id,p]))
  const forcedMap=new Map((forced||[]).map((f:any)=>[f.game_id,f]))

  let wins=0,losses=0,pushes=0

  return <main style={{maxWidth:760,margin:'0 auto',padding:'24px 12px 60px'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
      {team?.logo_url&&<img src={team.logo_url} alt={`${team.name} logo`} style={{width:52,height:52,objectFit:'contain'}}/>}
      <div>
        <h1 style={{textAlign:'center',margin:'0 0 4px'}}>{team?.name} Schedule</h1>
        <div style={{textAlign:'center',fontWeight:800,opacity:.72}}>2026–27 Regular Season</div>
      </div>
    </div>
    <Nav commissioner={profile?.role==='commissioner'}/>
    <div style={{display:'flex',justifyContent:'center',gap:18,margin:'8px 0 20px',fontSize:14}}><Link href={`/schedule?squad=${squad.id}`} style={{textDecoration:'underline',fontWeight:800}}>Back to calendar</Link><span>All times Eastern</span></div>

    {!rows.length?<div className="card" style={{textAlign:'center'}}>The 2026–27 NBA schedule has not been loaded yet.</div>:<section style={{background:'#fff',border:'1px solid #d1d5db',borderRadius:16,padding:'12px 14px 4px',overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'58px minmax(110px,1.35fr) minmax(105px,1.25fr) 78px 58px',gap:6,alignItems:'end',padding:'8px 4px 12px',fontWeight:900,fontSize:12,borderBottom:'2px solid #e5e7eb'}}>
        <div style={{textAlign:'center'}}>DAY<br/>DATE</div>
        <div>OPP</div>
        <div>SELECTION<br/>&amp; LINE</div>
        <div style={{textAlign:'center'}}>TIME /<br/>SCORE</div>
        <div style={{textAlign:'center'}}>RECORD</div>
      </div>

      {rows.map((g:any)=>{
        const home=g.home_team_id===squad.nba_team_id
        const opponentId=home?g.away_team_id:g.home_team_id
        const opp:any=teamMap.get(opponentId)
        const pick:any=pickMap.get(g.id)
        const miss=forcedMap.has(g.id)
        const selection:any=pick?teamMap.get(pick.selection_team_id):null
        if(miss||pick?.result==='loss')losses++
        else if(pick?.result==='win')wins++
        else if(pick?.result==='push')pushes++
        const record=(wins||losses||pushes)?`${wins}-${losses}${pushes?`-${pushes}`:''}`:'—'
        const dp=dateParts(g.scheduled_tipoff_time)
        const lineTeam=selection?.abbreviation||''
        const spread=pick?spreadForTeam(g,pick.selection_team_id):''
        const selectionText=miss?'AUTO LOSS':pick?`${lineTeam}${spread!=='—'?` ${spread}`:''}`:''
        const score=g.status==='final'?`${g.away_score}-${g.home_score}`:fmtTime(g.scheduled_tipoff_time)
        const color=statusColor(pick?.result,miss)
        return <div key={g.id} style={{display:'grid',gridTemplateColumns:'58px minmax(110px,1.35fr) minmax(105px,1.25fr) 78px 58px',gap:6,alignItems:'center',padding:'11px 4px',borderBottom:'1px solid #e5e7eb',fontSize:13}}>
          <div style={{textAlign:'center',fontWeight:900,lineHeight:1.1}}>
            <div>{dp.dow}</div>
            <div style={{marginTop:3}}>{dp.date}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,fontWeight:900}}>
            {opp?.logo_url&&<img src={opp.logo_url} alt={`${opp.name} logo`} style={{width:30,height:30,objectFit:'contain',flex:'0 0 auto'}}/>}
            <span style={{whiteSpace:'nowrap'}}>{home?'VS':'@'} {opp?.abbreviation||'TBD'}</span>
          </div>
          <div style={{fontWeight:900,color,whiteSpace:'nowrap'}}>{selectionText}</div>
          <div style={{textAlign:'center',fontWeight:900,whiteSpace:'nowrap'}}>{score}</div>
          <div style={{textAlign:'center',fontWeight:900,whiteSpace:'nowrap'}}>{record}</div>
        </div>
      })}
    </section>}

    <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center',marginTop:18,fontSize:12,fontWeight:700}}><span>🟩 ATS win</span><span>🟥 ATS loss / automatic loss</span><span>🟨 Push</span><span>⬜ No pick</span></div>
  </main>
}
