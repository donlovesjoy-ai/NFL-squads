 import Link from 'next/link'
import {
  notFound,
  redirect
} from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'
import SquadLogo from '../../components/SquadLogo'

function lineText(
  abbreviation:string|null|undefined,
  line:any
){
  if(
    !abbreviation ||
    line===null ||
    line===undefined
  ){
    return ''
  }

  const value=Number(line)

  if(value===0){
    return `${abbreviation} PK`
  }

  return `${abbreviation} ${
    value>0
      ? `+${value}`
      : value
  }`
}

function gameTimeEastern(
  value:string|Date|null
){
  if(!value){
    return '—'
  }

  return new Date(value)
    .toLocaleString(
      'en-US',
      {
        timeZone:'America/New_York',
        weekday:'short',
        hour:'numeric',
        minute:'2-digit'
      }
    )
}

function recordText(
  wins:any,
  losses:any,
  pushes:any
){
  const w=Number(wins||0)
  const l=Number(losses||0)
  const p=Number(pushes||0)

  if(p){
    return `${w}-${l}-${p}`
  }

  return `${w}-${l}`
}

function resultColor(
  result:any
){
  if(result==='W'){
    return 'green'
  }

  if(result==='L'){
    return 'red'
  }

  if(result==='P'){
    return '#1565c0'
  }

  return null
}

export default async function SquadSchedule({
  params
}:{
  params:Promise<{
    id:string
  }>
}){
  const {
    id
  }=await params

  const squadId=
    Number(id)

  if(
    !Number.isInteger(squadId) ||
    squadId<=0
  ){
    notFound()
  }

  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const [
    {data:profile},
    {data:squadData}
  ]=
    await Promise.all([

      supabase
        .from('users')
        .select('role')
        .eq('id',user.id)
        .maybeSingle(),

      supabase
        .from('squads')
        .select(`
          id,
          squad_name,
          owner_name,
          nfl_team_id,
          logo_path,

          nfl_teams(
            name,
            abbreviation
          )
        `)
        .eq(
          'season_year',
          2026
        )
        .eq(
          'id',
          squadId
        )
        .maybeSingle()
    ])

  if(!squadData){
    notFound()
  }

  const squad:any=
    squadData

  const commissioner=
    profile?.role===
    'commissioner'

  const [
    {data:scheduleRows},
    {data:leagueSquadData},
    {data:seasonPicks}
  ]=
    await Promise.all([

      supabase.rpc(
        'get_squad_schedule_profile',
        {
          p_squad_id:squadId,
          p_season_year:2026
        }
      ),

      supabase
        .from('squads')
        .select(`
          id,
          squad_name,
          nfl_team_id,
          logo_path,

          nfl_teams(
            abbreviation
          )
        `)
        .eq(
          'season_year',
          2026
        ),

      supabase
        .from('picks')
        .select(`
          result,

          games!inner(
            season_year
          )
        `)
        .eq(
          'squad_id',
          squadId
        )
        .eq(
          'games.season_year',
          2026
        )
        .in(
          'result',
          ['W','L','P']
        )
    ])

  const leagueSquads:any[]=
    leagueSquadData||[]

  const squadByNflTeam=
    new Map<number,any>()

  for(
    const leagueSquad
    of leagueSquads
  ){
    squadByNflTeam.set(
      Number(
        leagueSquad.nfl_team_id
      ),
      leagueSquad
    )
  }

  let overallWins=0
  let overallLosses=0
  let overallPushes=0

  for(
    const pick
    of seasonPicks||[]
  ){
    if(pick.result==='W'){
      overallWins++
    }

    if(pick.result==='L'){
      overallLosses++
    }

    if(pick.result==='P'){
      overallPushes++
    }
  }

  const squadNflTeam=
    Array.isArray(
      squad.nfl_teams
    )
      ? squad.nfl_teams[0]
      : squad.nfl_teams

  const teamAbbreviation=
    squadNflTeam
      ?.abbreviation ||
    ''

  const headCell={
    textAlign:'center' as const,
    padding:'9px 3px',
    whiteSpace:'normal' as const,
    fontSize:'0.76rem',
    lineHeight:1.1
  }

  const bodyCell={
    textAlign:'center' as const,
    padding:'9px 3px',
    verticalAlign:'middle' as const,
    fontSize:'0.78rem',
    lineHeight:1.15
  }

  return (
    <main className="wrap">

      <Nav
        commissioner={
          commissioner
        }
      />

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <div
          style={{
            display:'flex',
            justifyContent:'center',
            marginBottom:10
          }}
        >
          <SquadLogo
            logoPath={
              squad.logo_path
            }
            nflAbbreviation={
              teamAbbreviation
            }
            squadName={
              squad.squad_name
            }
            size={96}
          />
        </div>

        <h1
          style={{
            marginBottom:6
          }}
        >
          {squad.squad_name}
        </h1>

        <div
          style={{
            fontSize:'1.2rem',
            fontWeight:800
          }}
        >
          {recordText(
            overallWins,
            overallLosses,
            overallPushes
          )}
        </div>

        <div
          className="muted"
          style={{
            marginTop:4
          }}
        >
          2026 Squad Schedule
        </div>
      </section>

      <section className="card">

        <div
          style={{
            width:'100%',
            overflowX:'auto',
            WebkitOverflowScrolling:'touch'
          }}
        >
          <table
            style={{
              width:'100%',
              minWidth:520,
              borderCollapse:'collapse',
              tableLayout:'fixed'
            }}
          >
            <colgroup>
              <col
                style={{
                  width:'10%'
                }}
              />

              <col
                style={{
                  width:'25%'
                }}
              />

              <col
                style={{
                  width:'25%'
                }}
              />

              <col
                style={{
                  width:'24%'
                }}
              />

              <col
                style={{
                  width:'16%'
                }}
              />
            </colgroup>

            <thead>
              <tr>
                <th style={headCell}>
                  Week
                </th>

                <th style={headCell}>
                  Opponent
                </th>

                <th style={headCell}>
                  Selection
                  <br/>
                  &amp; Line
                </th>

                <th style={headCell}>
                  Game Time
                  <br/>
                  / Score
                </th>

                <th style={headCell}>
                  Record
                </th>
              </tr>
            </thead>

            <tbody>
              {(scheduleRows||[])
                .map(
                  (row:any)=>{

                    const opponentSquad=
                      row.opponent_team_id
                        ? squadByNflTeam.get(
                            Number(
                              row.opponent_team_id
                            )
                          )
                        : null

                    const opponentLogo=
                      opponentSquad
                        ?.logo_path ||
                      null

                    const opponentHref=
                      opponentSquad
                        ? `/squads/${opponentSquad.id}`
                        : null

                    const opponentName=
                      row.is_bye
                        ? 'BYE'
                        : `${
                            row.is_home
                              ? 'vs'
                              : '@'
                          } ${
                            opponentSquad
                              ?.squad_name ||
                            row.opponent_abbreviation ||
                            row.opponent_name ||
                            '—'
                          }`

                    const status=
                      String(
                        row.game_status||''
                      ).toLowerCase()

                    const kickedOff=
                      status==='live' ||
                      status==='final' ||
                      (
                        row.kickoff_time &&
                        new Date(
                          row.kickoff_time
                        )<=new Date()
                      )

                    let gameDisplay='—'

                    if(row.is_bye){
                      gameDisplay='—'
                    }else if(
                      status==='live' ||
                      status==='final'
                    ){
                      const ownScore=
                        row.is_home
                          ? row.home_score
                          : row.away_score

                      const opponentScore=
                        row.is_home
                          ? row.away_score
                          : row.home_score

                      gameDisplay=
                        `${teamAbbreviation} ${
                          ownScore ?? 0
                        }-${
                          opponentScore ?? 0
                        } ${
                          row.opponent_abbreviation ||
                          ''
                        }`
                    }else{
                      gameDisplay=
                        gameTimeEastern(
                          row.kickoff_time
                        )
                    }

                    const selection=
                      kickedOff
                        ? lineText(
                            row.selection_abbreviation,
                            row.selection_line
                          )
                        : ''

                    const color=
                      resultColor(
                        row.pick_result
                      )

                    const showRecord=
                      Boolean(
                        row.week_complete &&
                        row.record_wins!==null &&
                        row.record_losses!==null
                      )

                    return (
                      <tr
                        key={
                          row.nfl_week
                        }
                      >
                        <td
                          style={{
                            ...bodyCell,
                            fontWeight:800
                          }}
                        >
                          {row.nfl_week}
                        </td>

                        <td
                          style={bodyCell}
                        >
                          {row.is_bye ? (
                            <b>
                              BYE
                            </b>
                          ) : opponentHref ? (
                            <Link
                              href={
                                opponentHref
                              }
                              style={{
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center',
                                gap:5,
                                color:'inherit',
                                textDecoration:'none',
                                fontWeight:700
                              }}
                            >
                              <SquadLogo
                                logoPath={
                                  opponentLogo
                                }
                                nflAbbreviation={
                                  row.opponent_abbreviation
                                }
                                squadName={
                                  opponentName
                                }
                                size={22}
                              />

                              <span>
                                {opponentName}
                              </span>
                            </Link>
                          ) : (
                            <div
                              style={{
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center',
                                gap:5,
                                fontWeight:700
                              }}
                            >
                              <SquadLogo
                                logoPath={
                                  null
                                }
                                nflAbbreviation={
                                  row.opponent_abbreviation
                                }
                                squadName={
                                  opponentName
                                }
                                size={22}
                              />

                              <span>
                                {opponentName}
                              </span>
                            </div>
                          )}
                        </td>

                        <td
                          style={bodyCell}
                        >
                          {selection ? (
                            <span
                              style={{
                                display:'inline-block',
                                padding:'5px 7px',
                                borderRadius:9,
                                border:
                                  `2px solid ${
                                    color ||
                                    '#555'
                                  }`,
                                color:
                                  color ||
                                  'inherit',
                                fontWeight:800,
                                whiteSpace:'nowrap'
                              }}
                            >
                              {selection}
                            </span>
                          ) : (
                            <span>
                              &nbsp;
                            </span>
                          )}
                        </td>

                        <td
                          style={{
                            ...bodyCell,
                            whiteSpace:'nowrap',
                            fontWeight:
                              status==='live' ||
                              status==='final'
                                ? 700
                                : 500,
                            fontSize:
                              status==='live' ||
                              status==='final'
                                ? '0.78rem'
                                : '0.73rem'
                          }}
                        >
                          {gameDisplay}
                        </td>

                        <td
                          style={{
                            ...bodyCell,
                            whiteSpace:'nowrap',
                            fontWeight:800
                          }}
                        >
                          {showRecord
                            ? recordText(
                                row.record_wins,
                                row.record_losses,
                                row.record_pushes
                              )
                            : ''
                          }
                        </td>
                      </tr>
                    )
                  }
                )}
            </tbody>
          </table>
        </div>

        <p
          className="muted"
          style={{
            textAlign:'center',
            fontSize:'0.74rem',
            marginTop:14,
            marginBottom:0
          }}
        >
          All times ET. Selections reveal at
          kickoff and results update automatically.
        </p>
      </section>

    </main>
  )
}