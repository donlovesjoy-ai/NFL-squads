 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import WeekSelector from './week-selector'

function signed(n:any){
  if(n===null || n===undefined){
    return 'Pending'
  }

  const x=Number(n)

  if(x===0){
    return 'PK'
  }

  return x>0
    ? `+${x}`
    : `${x}`
}

function kickoffEastern(value:string|Date){
  return new Date(value).toLocaleString(
    'en-US',
    {
      timeZone:'America/New_York',
      month:'short',
      day:'numeric',
      hour:'numeric',
      minute:'2-digit'
    }
  )
}

export default async function Schedule({
  searchParams
}:{
  searchParams:Promise<{week?:string}>
}){
  const sp=await searchParams

  const week=
    Math.min(
      18,
      Math.max(
        1,
        Number(sp.week||1)
      )
    )

  const supabase=await createClient()

  const {data:{user}}=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  const commissioner=
    profile?.role==='commissioner'

  const [
    {data:squads},
    {data:games},
    {data:divisionNames}
  ]=await Promise.all([

    supabase
      .from('squads')
      .select(`
        id,
        user_id,
        owner_name,
        squad_name,
        nfl_team_id,
        division,
        nfl_teams(
          name,
          abbreviation
        )
      `)
      .eq('season_year',2026)
      .order('division')
      .order('squad_name'),

    supabase
      .from('games')
      .select(`
        id,
        nfl_week,
        kickoff_time,
        spread,
        total,
        status,
        home_score,
        away_score,
        home_team_id,
        away_team_id,
        home:nfl_teams!games_home_team_id_fkey(
          name,
          abbreviation
        ),
        away:nfl_teams!games_away_team_id_fkey(
          name,
          abbreviation
        )
      `)
      .eq('season_year',2026)
      .eq('nfl_week',week)
      .order('kickoff_time'),

    supabase
      .from('division_names')
      .select(
        'division,division_name'
      )
      .eq('season_year',2026)
      .order('division')
  ])

  const gameIds=
    (games||[]).map(
      (g:any)=>g.id
    )

  let weekPicks:any[]=[]

  if(gameIds.length){
    const {data:picks}=await supabase
      .from('picks')
      .select(`
        squad_id,
        game_id,
        selection_team_id,
        result,
        revealed,
        is_missed,
        ats_margin
      `)
      .in(
        'game_id',
        gameIds
      )

    weekPicks=picks||[]
  }

  const pickBySquadGame=
    new Map(
      weekPicks.map(
        (p:any)=>[
          `${p.squad_id}:${p.game_id}`,
          p
        ]
      )
    )

  const mySquad=
    (squads||[]).find(
      (s:any)=>
        s.user_id===user.id
    )

  const squadByNflTeam=
    new Map<number,any>()

  for(const s of squads||[]){
    squadByNflTeam.set(
      Number(s.nfl_team_id),
      s
    )
  }

  const divisionOrder=
    mySquad
      ? [
          mySquad.division,
          ...[1,2,3,4].filter(
            d=>
              d!==mySquad.division
          )
        ]
      : [1,2,3,4]

  const squadsByDivision=
    divisionOrder.map(
      division=>({
        division,

        divisionName:
          (divisionNames||[])
            .find(
              (d:any)=>
                d.division===division
            )
            ?.division_name
          || `Division ${division}`,

        squads:
          (squads||[])
            .filter(
              (s:any)=>
                s.division===division
            )
            .sort(
              (a:any,b:any)=>{
                if(a.id===mySquad?.id){
                  return -1
                }

                if(b.id===mySquad?.id){
                  return 1
                }

                return String(
                  a.squad_name
                ).localeCompare(
                  String(b.squad_name)
                )
              }
            )
      })
    )

  const gameForTeam=(teamId:number)=>{
    return (games||[]).find(
      (g:any)=>
        g.home_team_id===teamId ||
        g.away_team_id===teamId
    )
  }

  const headCell={
    textAlign:'center' as const,
    padding:'8px 5px',
    whiteSpace:'nowrap' as const,
    fontSize:'0.9rem'
  }

  const bodyCell={
    textAlign:'center' as const,
    padding:'8px 5px',
    fontSize:'0.9rem',
    verticalAlign:'middle' as const
  }

  return (
    <main className="wrap">

      <div
        className="top"
        style={{
          justifyContent:'center',
          textAlign:'center'
        }}
      >
        <div>
          <div className="big">
            NFL SQUADS
          </div>

          <div className="muted">
            2026 Schedule & Results
          </div>
        </div>
      </div>

      <Nav commissioner={commissioner}/>

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h1>
          Schedule & Results
        </h1>

        <p className="muted">
          Select any NFL week to view every
          league squad&apos;s matchup and result.
        </p>

        <p
          className="muted"
          style={{
            fontSize:'0.78rem',
            marginTop:-4
          }}
        >
          * All times EDT
        </p>

        <div
          style={{
            display:'flex',
            justifyContent:'center'
          }}
        >
          <WeekSelector week={week}/>
        </div>
      </section>

      <section className="card">

        <h2
          style={{
            textAlign:'center'
          }}
        >
          Week {week}
        </h2>

        <div
          style={{
            overflowX:'auto',
            width:'100%'
          }}
        >
          <table
            style={{
              width:'100%',
              borderCollapse:'collapse',
              tableLayout:'fixed'
            }}
          >
            <colgroup>
              <col style={{width:'25%'}}/>
              <col style={{width:'12%'}}/>
              <col style={{width:'25%'}}/>
              <col style={{width:'18%'}}/>
              <col style={{width:'20%'}}/>
            </colgroup>

            <thead>
              <tr>
                <th style={headCell}>
                  Team
                </th>

                <th style={headCell}>
                  Line
                </th>

                <th style={headCell}>
                  Opponent
                </th>

                <th style={headCell}>
                  Score
                </th>

                <th style={headCell}>
                  Result
                </th>
              </tr>
            </thead>

            <tbody>

              {squadsByDivision.flatMap(
                ({
                  division,
                  divisionName,
                  squads:divisionSquads
                })=>[
                  <tr
                    key={`division-${division}`}
                  >
                    <td
                      colSpan={5}
                      style={{
                        textAlign:'center',
                        padding:'12px 6px 8px'
                      }}
                    >
                      <strong>
                        {divisionName}
                      </strong>
                    </td>
                  </tr>,

                  ...divisionSquads.map(
                    (s:any)=>{
                      const g:any=
                        gameForTeam(
                          Number(
                            s.nfl_team_id
                          )
                        )

                      if(!g){
                        return (
                          <tr key={s.id}>

                            <td
                              style={bodyCell}
                              title={
                                s.owner_name
                                  ? `${s.owner_name}, Owner`
                                  : undefined
                              }
                            >
                              <div
                                style={{
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center',
                                  gap:6
                                }}
                              >
                                <img
                                  src={`/helmets/${s.nfl_teams?.abbreviation}.png`}
                                  alt=""
                                  width={28}
                                  height={28}
                                  style={{
                                    objectFit:'contain',
                                    flexShrink:0
                                  }}
                                />

                                <b>
                                  {s.squad_name}
                                </b>
                              </div>
                            </td>

                            <td
                              colSpan={4}
                              style={{
                                ...bodyCell,
                                fontWeight:700
                              }}
                            >
                              BYE
                            </td>

                          </tr>
                        )
                      }

                      const isHome=
                        g.home_team_id===
                        s.nfl_team_id

                      const opponentTeamId=
                        isHome
                          ? g.away_team_id
                          : g.home_team_id

                      const opponentNfl=
                        isHome
                          ? g.away
                          : g.home

                      const opponentSquad=
                        squadByNflTeam.get(
                          Number(
                            opponentTeamId
                          )
                        )

                      const opponentLabel=
                        opponentSquad
                          ?.squad_name ||
                        opponentNfl
                          ?.name ||
                        '—'

                      const ownedSpread=
                        g.spread===null
                          ? null
                          : (
                              isHome
                                ? Number(g.spread)
                                : -Number(g.spread)
                            )

                      const opponentSpread=
                        ownedSpread===null
                          ? null
                          : -ownedSpread

                      const pick:any=
                        pickBySquadGame.get(
                          `${s.id}:${g.id}`
                        )

                      const kickedOff=
                        g.status==='live' ||
                        g.status==='final' ||
                        new Date(
                          g.kickoff_time
                        )<=new Date()

                      const pickRevealed=
                        kickedOff &&
                        pick &&
                        !pick.is_missed

                      const pickedOwnTeam=
                        pickRevealed &&
                        Number(
                          pick.selection_team_id
                        )===
                        Number(
                          s.nfl_team_id
                        )

                      const pickedOpponent=
                        pickRevealed &&
                        Number(
                          pick.selection_team_id
                        )===
                        Number(
                          opponentTeamId
                        )

                      const displayedSpread=
                        pickedOpponent
                          ? opponentSpread
                          : ownedSpread

                      let score=
                        kickoffEastern(
                          g.kickoff_time
                        )

                      if(g.status==='live'){
                        const ownScore=
                          isHome
                            ? g.home_score
                            : g.away_score

                        const oppScore=
                          isHome
                            ? g.away_score
                            : g.home_score

                        score=
                          `${ownScore ?? 0}-${oppScore ?? 0}`
                      }
                      else if(g.status==='final'){
                        const ownScore=
                          isHome
                            ? g.home_score
                            : g.away_score

                        const oppScore=
                          isHome
                            ? g.away_score
                            : g.home_score

                        score=
                          `${ownScore ?? 0}-${oppScore ?? 0}`
                      }

                      const selectionStyle=(
                        selected:boolean
                      )=>{
                        if(!selected){
                          return undefined
                        }

                        return {
                          border:'2px solid currentColor',
                          borderRadius:8,
                          padding:'5px 6px',
                          fontWeight:800,
                          display:'inline-flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:6
                        }
                      }

                      return (
                        <tr key={s.id}>

                          <td
                            style={bodyCell}
                            title={
                              s.owner_name
                                ? `${s.owner_name}, Owner`
                                : undefined
                            }
                          >
                            <div
                              style={
                                selectionStyle(
                                  pickedOwnTeam
                                ) || {
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center',
                                  gap:6
                                }
                              }
                            >
                              <img
                                src={`/helmets/${s.nfl_teams?.abbreviation}.png`}
                                alt=""
                                width={28}
                                height={28}
                                style={{
                                  objectFit:'contain',
                                  flexShrink:0
                                }}
                              />

                              <b>
                                {s.squad_name}
                              </b>
                            </div>
                          </td>

                          <td
                            style={{
                              ...bodyCell,
                              whiteSpace:'nowrap',
                              fontWeight:
                                pickRevealed
                                  ? 800
                                  : 500
                            }}
                          >
                            {signed(
                              displayedSpread
                            )}
                          </td>

                          <td style={bodyCell}>
                            <div
                              style={
                                selectionStyle(
                                  pickedOpponent
                                ) || {
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center',
                                  gap:6
                                }
                              }
                            >
                              <img
                                src={`/helmets/${opponentNfl?.abbreviation}.png`}
                                alt=""
                                width={28}
                                height={28}
                                style={{
                                  objectFit:'contain',
                                  flexShrink:0
                                }}
                              />

                              <span>
                                {isHome
                                  ? 'vs '
                                  : '@ '}

                                {opponentLabel}
                              </span>
                            </div>
                          </td>

                          <td
                            style={{
                              ...bodyCell,
                              whiteSpace:'nowrap',
                              fontWeight:
                                kickedOff
                                  ? 700
                                  : 500,
                              fontSize:
                                kickedOff
                                  ? '0.9rem'
                                  : '0.8rem'
                            }}
                          >
                            {score}
                          </td>

                          <td
                            style={{
                              ...bodyCell,
                              whiteSpace:'nowrap'
                            }}
                          >
                            {(()=>{
                              if(!kickedOff){
                                return (
                                  pick &&
                                  !pick.is_missed
                                    ? (
                                      <span
                                        style={{
                                          color:'green',
                                          fontWeight:700,
                                          fontSize:'1.2rem'
                                        }}
                                      >
                                        ✓
                                      </span>
                                    )
                                    : (
                                      <span className="muted">
                                        —
                                      </span>
                                    )
                                )
                              }

                              if(pick?.is_missed){
                                if(
                                  g.status==='final'
                                ){
                                  const margin=
                                    Number(
                                      pick.ats_margin ??
                                      0
                                    )

                                  return (
                                    <b
                                      style={{
                                        color:
                                          margin<0
                                            ? 'red'
                                            : margin>0
                                              ? 'green'
                                              : undefined
                                      }}
                                    >
                                      NO PICK{' '}
                                      {margin>0
                                        ? '+'
                                        : ''}
                                      {margin}
                                    </b>
                                  )
                                }

                                return (
                                  <b>
                                    NO PICK
                                  </b>
                                )
                              }

                              if(!pick){
                                return (
                                  <span className="muted">
                                    —
                                  </span>
                                )
                              }

                              const pickedHome=
                                Number(
                                  pick.selection_team_id
                                )===
                                Number(
                                  g.home_team_id
                                )

                              const pickedTeam=
                                pickedHome
                                  ? g.home
                                  : g.away

                              const teamLabel=
                                pickedTeam
                                  ?.abbreviation ||
                                pickedTeam
                                  ?.name ||
                                'Pick'

                              if(
                                g.status==='final'
                              ){
                                const margin=
                                  Number(
                                    pick.ats_margin ??
                                    0
                                  )

                                const color=
                                  margin>0
                                    ? 'green'
                                    : margin<0
                                      ? 'red'
                                      : undefined

                                return (
                                  <b style={{color}}>
                                    {teamLabel}{' '}
                                    {margin>0
                                      ? '+'
                                      : ''}
                                    {margin}
                                  </b>
                                )
                              }

                              return (
                                <b>
                                  {teamLabel}
                                </b>
                              )
                            })()}
                          </td>

                        </tr>
                      )
                    }
                  )
                ]
              )}

            </tbody>
          </table>
        </div>
      </section>

    </main>
  )
}