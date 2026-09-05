import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'

function pct(r:any){
  const games=(r.wins||0)+(r.losses||0)+(r.pushes||0)
  return games ? ((r.wins||0)+(r.pushes||0)*0.5)/games : 0
}

function signed(n:any){
  const x=Number(n||0)
  return x>0 ? `+${x}` : `${x}`
}

function squadNameParts(squadName:string,nflName?:string|null){
  const squadWords=String(squadName||'').trim().split(/\s+/).filter(Boolean)
  const nflWords=String(nflName||'').trim().split(/\s+/).filter(Boolean)

  let shared=0
  while(
    shared<squadWords.length &&
    shared<nflWords.length &&
    squadWords[shared].toLowerCase()===nflWords[shared].toLowerCase()
  ){
    shared++
  }

  if(shared>0 && shared<squadWords.length){
    return {
      area:squadWords.slice(0,shared).join(' '),
      nickname:squadWords.slice(shared).join(' ')
    }
  }

  if(squadWords.length<=1){
    return {area:squadWords[0]||'',nickname:'\u00a0'}
  }

  return {
    area:squadWords[0],
    nickname:squadWords.slice(1).join(' ')
  }
}

export default async function Standings(){
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

  const commissioner=profile?.role==='commissioner'

  const [
    {data},
    {data:names}
  ]=await Promise.all([
    supabase
      .from('standings')
      .select(`
        wins,
        losses,
        pushes,
        ats_margin,

        squads!inner(
          id,
          user_id,
          owner_name,
          squad_name,
          division,
          logo_path,

          nfl_teams(
            name,
            abbreviation
          )
        )
      `)
      .eq('season_year',2026),

    supabase
      .from('division_names')
      .select('division,division_name')
      .eq('season_year',2026)
      .order('division')
  ])

  const myRow:any=(data||[]).find((r:any)=>r.squads?.user_id===user.id)
  const myDivision=myRow?.squads?.division
  const divisionOrder=myDivision
    ? [myDivision,...[1,2,3,4].filter(d=>d!==myDivision)]
    : [1,2,3,4]

  const headCell={
    textAlign:'center' as const,
    padding:'7px 2px',
    whiteSpace:'nowrap' as const,
    fontSize:'0.79rem'
  }

  const bodyCell={
    textAlign:'center' as const,
    padding:'7px 2px',
    verticalAlign:'middle' as const,
    fontSize:'0.79rem'
  }

  return (
    <main className="wrap">
      <Nav commissioner={commissioner}/>

      <h1 style={{textAlign:'center'}}>Standings</h1>

      {divisionOrder.map(d=>{
        const title=(names||[]).find((x:any)=>x.division===d)?.division_name || `Division ${d}`
        const rows=(data||[])
          .filter((r:any)=>r.squads?.division===d)
          .sort((a:any,b:any)=>pct(b)-pct(a) || Number(b.ats_margin)-Number(a.ats_margin))

        return (
          <section
            className="card division"
            key={d}
            style={{textAlign:'center'}}
          >
            <h2 style={{textAlign:'center'}}>{title}</h2>

            {rows.length===0 ? (
              <p className="muted">No teams assigned yet.</p>
            ) : (
              <table
                style={{
                  width:'100%',
                  textAlign:'center',
                  borderCollapse:'collapse',
                  tableLayout:'fixed'
                }}
              >
                <colgroup>
                  <col style={{width:'24%'}}/>
                  <col style={{width:'40%'}}/>
                  <col style={{width:'6%'}}/>
                  <col style={{width:'6%'}}/>
                  <col style={{width:'6%'}}/>
                  <col style={{width:'18%'}}/>
                </colgroup>

                <thead>
                  <tr>
                    <th style={headCell}>Owner</th>
                    <th style={headCell}>Team</th>
                    <th style={headCell}>W</th>
                    <th style={headCell}>L</th>
                    <th style={headCell}>T</th>
                    <th style={headCell}>ATS</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r:any,i:number)=>{
                    const isMe=r.squads?.user_id===user.id
                    const nflTeam=Array.isArray(r.squads?.nfl_teams)
                      ? r.squads.nfl_teams[0]
                      : r.squads?.nfl_teams
                    const name=squadNameParts(r.squads.squad_name,nflTeam?.name)

                    return (
                      <tr key={i} style={isMe ? {fontWeight:700} : undefined}>
                        <td
                          style={{
                            ...bodyCell,
                            whiteSpace:'normal',
                            lineHeight:1.15
                          }}
                        >
                          {r.squads.owner_name || '—'}
                        </td>

                        <td style={{...bodyCell,whiteSpace:'normal',lineHeight:1.1}}>
                          <Link
                            href={`/squads/${r.squads.id}`}
                            style={{
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center',
                              gap:5,
                              color:'inherit',
                              textDecoration:'none'
                            }}
                          >
                            <SquadLogo
                              logoPath={r.squads.logo_path}
                              nflAbbreviation={nflTeam?.abbreviation}
                              squadName={r.squads.squad_name}
                              size={22}
                            />

                            <b
                              style={{
                                lineHeight:1.05,
                                display:'flex',
                                flexDirection:'column',
                                alignItems:'center',
                                minWidth:0
                              }}
                            >
                              <span style={{display:'block',whiteSpace:'nowrap'}}>{name.area}</span>
                              <span style={{display:'block',whiteSpace:'nowrap'}}>{name.nickname}</span>
                            </b>
                          </Link>
                        </td>

                        <td style={{...bodyCell,whiteSpace:'nowrap'}}>{r.wins}</td>
                        <td style={{...bodyCell,whiteSpace:'nowrap'}}>{r.losses}</td>
                        <td style={{...bodyCell,whiteSpace:'nowrap'}}>{r.pushes}</td>
                        <td style={{...bodyCell,whiteSpace:'nowrap'}}>{signed(r.ats_margin)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        )
      })}
    </main>
  )
}
