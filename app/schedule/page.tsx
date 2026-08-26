 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import WeekSelector from './week-selector'
import SquadLogo from '../components/SquadLogo'

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
  const kickoff=new Date(value)

  const millisecondsUntilKickoff=
    kickoff.getTime()-Date.now()

  const sevenDays=
    7*24*60*60*1000

  const withinSevenDays=
    millisecondsUntilKickoff>0 &&
    millisecondsUntilKickoff<sevenDays

  if(withinSevenDays){
    return kickoff.toLocaleString(
      'en-US',
      {
        timeZone:'America/New_York',
        weekday:'short',
        hour:'numeric',
        minute:'2-digit'
      }
    )
  }

  return kickoff.toLocaleString(
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

function pickOutlineColor(
  gameStatus:any,
  pick:any
){
  if(!pick || pick.is_missed){
    return null
  }

  const status=
    String(
      gameStatus||''
    ).toLowerCase()

  if(status!=='final'){
    return '#111'
  }

  if(
    pick.ats_margin===null ||
    pick.ats_margin===undefined
  ){
    return '#111'
  }

  const margin=
    Number(
      pick.ats_margin
    )

  if(margin>0){
    return 'green'
  }

  if(margin<0){
    return 'red'
  }

  return '#1565c0'
}

export default async function Schedule({
  searchParams
}:{
  searchParams:Promise<{week?:string}>
}){
  const sp=await searchParams

  const supabase=await createClient()

  const {data:{user}}=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  let week:number

  if(sp.week){
    week=
      Math.min(
        18,
        Math.max(
          1,
          Number(sp.week)
        )
      )
  }else{
    const {data:activeGames}=
      await supabase
        .from('games')
        .select(`
          nfl_week
        `)
        .eq(
          'season_year',
          2026
        )
        .neq(
          'status',
          'final'
        )
        .order(
          'nfl_week',
          {ascending:true}
        )
        .limit(1)

    const activeWeek=
      activeGames?.[0]
        ?.nfl_week

    week=
      Math.min(
        18,
        Math.max(
          1,
          Number(
            activeWeek||1
          )
        )
      )
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
        logo_path,
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
        Number(g.home_team_id)===teamId ||
        Number(g.away_team_id)===teamId
    )
  }

  const headCell={
    textAlign:'center' as const,
    padding:'8px 2px',
    whiteSpace:'nowrap' as const,
    fontSize:'0.8rem'
  }

  const bodyCell={
    textAlign:'center' as const,
    padding:'8px 2px',
    fontSize:'0.8rem',
    verticalAlign:'middle' as const,
    boxSizing:'border-box' as const
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
            fontSize:'0.76rem',
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
            width:'100%',
            overflowX:'auto',
            WebkitOverflowScrolling:'touch'
          }}
        >
          <table
            style={{
              borderCollapse:'separate',
              borderSpacing:0,
              tableLayout:'fixed',
              width:550,
              minWidth:550
            }}
          >
            <colgroup>
              <col style={{width:115}}/>
              <col style={{width:45}}/>
              <col style={{width:130}}/>
              <col style={{width:125}}/>
              <col style={{width:135}}/>
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
                  Pick / Result
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
                      colSpan={3}
                      style={{
                        padding:'12px 4px 8px'
                      }}
                    >
                      <div
                        style={{
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:8,
                          whiteSpace:'nowrap'
                        }}
                      >
                        <strong>
                          {divisionName}
                        </strong>

                        <span
                          className="muted"
                          aria-label="More information to the right"
                          style={{
                            fontSize:'0.9rem',
                            fontWeight:800,
                            letterSpacing:'-0.1em',
                            opacity:0.7
                          }}
                        >
                          ››
                        </span>
                      </div>
                    </td>

                    <td
                      colSpan={2}
                      style={{
                        padding:'12px 4px 8px'
                      }}
                    />
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
                              <TeamDisplay
                                logoPath={
                                  s.logo_path
                                }
                                abbreviation={
                                  s.nfl_teams
                                    ?.abbreviation
                                }
                                name={s.squad_name}
                              />
                            </td>

                            <td style={bodyCell}>
                              —
                            </td>

                            <td
                              style={{
                                ...bodyCell,
                                fontWeight:800
                              }}
                            >
                              BYE
                            </td>

                            <td style={bodyCell}>
                              —
                            </td>

                            <td style={bodyCell}>
                              —
                            </td>

                          </tr>
                        )
                      }

                      const isHome=
                        Number(
                          g.home_team_id
                        )===
                        Number(
                          s.nfl_team_id
                        )

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
                                ? Number(
                                    g.spread
                                  )
                                : -Number(
                                    g.spread
                                  )
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
                        Boolean(
                          kickedOff &&
                          pick &&
                          !pick.is_missed
                        )

                      const pickedOwnTeam=
                        Boolean(
                          pickRevealed &&
                          Number(
                            pick.selection_team_id
                          )===
                          Number(
                            s.nfl_team_id
                          )
                        )

                      const pickedOpponent=
                        Boolean(
                          pickRevealed &&
                          Number(
                            pick.selection_team_id
                          )===
                          Number(
                            opponentTeamId
                          )
                        )

                      const displayedSpread=
                        pickedOpponent
                          ? opponentSpread
                          : ownedSpread

                      const outlineColor=
                        pickRevealed
                          ? pickOutlineColor(
                              g.status,
                              pick
                            )
                          : null

                      const teamSelectionStyle=
                        pickedOwnTeam &&
                        outlineColor
                          ? {
                              borderTop:
                                `2px solid ${outlineColor}`,
                              borderBottom:
                                `2px solid ${outlineColor}`,
                              borderLeft:
                                `2px solid ${outlineColor}`,
                              borderTopLeftRadius:10,
                              borderBottomLeftRadius:10
                            }
                          : {}

                      const lineOwnSelectionStyle=
                        pickedOwnTeam &&
                        outlineColor
                          ? {
                              borderTop:
                                `2px solid ${outlineColor}`,
                              borderBottom:
                                `2px solid ${outlineColor}`,
                              borderRight:
                                `2px solid ${outlineColor}`,
                              borderTopRightRadius:10,
                              borderBottomRightRadius:10
                            }
                          : {}

                      const lineOpponentSelectionStyle=
                        pickedOpponent &&
                        outlineColor
                          ? {
                              borderTop:
                                `2px solid ${outlineColor}`,
                              borderBottom:
                                `2px solid ${outlineColor}`,
                              borderLeft:
                                `2px solid ${outlineColor}`,
                              borderTopLeftRadius:10,
                              borderBottomLeftRadius:10
                            }
                          : {}

                      const opponentSelectionStyle=
                        pickedOpponent &&
                        outlineColor
                          ? {
                              borderTop:
                                `2px solid ${outlineColor}`,
                              borderBottom:
                                `2px solid ${outlineColor}`,
                              borderRight:
                                `2px solid ${outlineColor}`,
                              borderTopRightRadius:10,
                              borderBottomRightRadius:10
                            }
                          : {}

                      let score=
                        kickoffEastern(
                          g.kickoff_time
                        )

                      if(
                        g.status==='live' ||
                        g.status==='final'
                      ){
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

                      return (
                        <tr key={s.id}>

                          <td
                            style={{
                              ...bodyCell,
                              ...teamSelectionStyle
                            }}
                            title={
                              s.owner_name
                                ? `${s.owner_name}, Owner`
                                : undefined
                            }
                          >
                            <TeamDisplay
                              logoPath={
                                s.logo_path
                              }
                              abbreviation={
                                s.nfl_teams
                                  ?.abbreviation
                              }
                              name={s.squad_name}
                              emphasized={
                                pickedOwnTeam
                              }
                            />
                          </td>

                          <td
                            style={{
                              ...bodyCell,
                              ...lineOwnSelectionStyle,
                              ...lineOpponentSelectionStyle,
                              whiteSpace:'nowrap',
                              fontWeight:
                                pickRevealed
                                  ? 800
                                  : 600
                            }}
                          >
                            {signed(
                              displayedSpread
                            )}
                          </td>

                          <td
                            style={{
                              ...bodyCell,
                              ...opponentSelectionStyle
                            }}
                          >
                            <TeamDisplay
                              logoPath={
                                opponentSquad
                                  ?.logo_path
                              }
                              abbreviation={
                                opponentNfl
                                  ?.abbreviation
                              }
                              name={
                                `${isHome
                                  ? 'vs '
                                  : '@ '}${opponentLabel}`
                              }
                              emphasized={
                                pickedOpponent
                              }
                            />
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
                                  ? '0.8rem'
                                  : '0.74rem'
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
                                          fontSize:'1.15rem'
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
                                              : '#1565c0'
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
                                      : '#1565c0'

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

function TeamDisplay({
  logoPath,
  abbreviation,
  name,
  emphasized=false
}:{
  logoPath?:string|null
  abbreviation?:string
  name:string
  emphasized?:boolean
}){
  return (
    <div
      style={{
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        gap:4,
        minWidth:0,
        width:'100%',
        boxSizing:'border-box',
        padding:'4px 2px',
        fontWeight:
          emphasized
            ? 800
            : 600
      }}
    >
      <SquadLogo
        logoPath={logoPath}
        nflAbbreviation={abbreviation}
        squadName={name}
        size={22}
      />

      <span
        style={{
          minWidth:0,
          lineHeight:1.08,
          overflowWrap:'normal',
          wordBreak:'normal',
          hyphens:'none'
        }}
      >
        {name}
      </span>
    </div>
  )
}