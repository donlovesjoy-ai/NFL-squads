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

function gameDateEastern(
  value:string|Date|null
){
  if(!value){
    return '—'
  }

  return new Date(value)
    .toLocaleDateString(
      'en-US',
      {
        timeZone:'America/New_York',
        month:'numeric',
        day:'numeric'
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

function signed(value:any){
  const number=
    Number(value||0)

  if(number>0){
    return `+${number}`
  }

  return `${number}`
}

function ordinal(n:number){
  const mod100=n%100

  if(mod100>=11 && mod100<=13){
    return `${n}th`
  }

  switch(n%10){
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function sameStanding(
  a:any,
  b:any
){
  return (
    Number(a.wins||0)===
      Number(b.wins||0) &&
    Number(a.losses||0)===
      Number(b.losses||0) &&
    Number(a.pushes||0)===
      Number(b.pushes||0) &&
    Number(a.ats_margin||0)===
      Number(b.ats_margin||0)
  )
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
        .eq(
          'id',
          user.id
        )
        .maybeSingle(),

      supabase
        .from('squads')
        .select(`
          id,
          squad_name,
          owner_name,
          division,
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
    {data:standingsData}
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
        .from('standings')
        .select(`
          wins,
          losses,
          pushes,
          ats_margin,

          squads!inner(
            id,
            division
          )
        `)
        .eq(
          'season_year',
          2026
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

  const divisionRows=
    (standingsData||[])
      .filter(
        (row:any)=>
          Number(
            row.squads?.division
          )===
          Number(
            squad.division
          )
      )
      .sort(
        (a:any,b:any)=>
          (
            Number(b.wins||0)-
            Number(a.wins||0)
          ) ||
          (
            Number(b.ats_margin||0)-
            Number(a.ats_margin||0)
          ) ||
          (
            Number(a.squads?.id||0)-
            Number(b.squads?.id||0)
          )
      )

  const rankedDivisionRows=
    divisionRows.map(
      (
        row:any,
        index:number
      )=>{
        const previous=
          divisionRows[index-1]

        let rank=1

        if(index>0){
          if(
            sameStanding(
              row,
              previous
            )
          ){
            const firstMatchingIndex=
              divisionRows
                .slice(
                  0,
                  index
                )
                .findIndex(
                  (candidate:any)=>
                    sameStanding(
                      candidate,
                      row
                    )
                )

            rank=
              firstMatchingIndex+1
          }else{
            rank=
              index+1
          }
        }

        const tied=
          divisionRows.some(
            (other:any)=>
              Number(
                other.squads?.id
              )!==
              Number(
                row.squads?.id
              ) &&
              sameStanding(
                other,
                row
              )
          )

        return {
          ...row,
          displayRank:rank,
          tied
        }
      }
    )

  const squadStanding:any=
    rankedDivisionRows.find(
      (row:any)=>
        Number(
          row.squads?.id
        )===
        Number(
          squadId
        )
    )

  const standingPosition=
    squadStanding
      ? `${
          squadStanding.tied
            ? 'T-'
            : ''
        }${ordinal(
          squadStanding.displayRank
        )} Place`
      : '—'

  const headCell={
    textAlign:'center' as const,
    padding:'7px 1px',
    whiteSpace:'normal' as const,
    fontSize:'0.68rem',
    lineHeight:1.05
  }

  const bodyCell={
    textAlign:'center' as const,
    padding:'8px 1px',
    verticalAlign:'middle' as const,
    fontSize:'0.72rem',
    lineHeight:1.05
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
            marginBottom:6
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
            size={143}
          />
        </div>

        <h1
          style={{
            marginBottom:8
          }}
        >
          {squad.squad_name}
        </h1>

        <div
          style={{
            fontSize:'1rem',
            fontWeight:800
          }}
        >
          Record:{' '}
          {recordText(
            squadStanding?.wins,
            squadStanding?.losses,
            squadStanding?.pushes
          )}
        </div>

        <div
          style={{
            marginTop:5,
            fontSize:'0.95rem',
            fontWeight:800
          }}
        >
          Division Standing:{' '}
          {standingPosition}
        </div>

        <div
          style={{
            marginTop:5,
            fontSize:'0.95rem',
            fontWeight:800
          }}
        >
          ATS:{' '}
          {signed(
            squadStanding?.ats_margin
          )}
        </div>
      </section>

      <section className="card">

        <table
          style={{
            width:'100%',
            borderCollapse:'collapse',
            tableLayout:'fixed'
          }}
        >
          <colgroup>
            <col
              style={{
                width:'8%'
              }}
            />

            <col
              style={{
                width:'24%'
              }}
            />

            <col
              style={{
                width:'27%'
              }}
            />

            <col
              style={{
                width:'22%'
              }}
            />

            <col
              style={{
                width:'19%'
              }}
            />
          </colgroup>

          <thead>
            <tr>
              <th style={headCell}>
                Wk
              </th>

              <th style={headCell}>
                Opp
              </th>

              <th style={headCell}>
                Selection
                <br/>
                &amp; Line
              </th>

              <th style={headCell}>
                Date /
                <br/>
                Score
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

                  const opponentText=
                    row.is_bye
                      ? 'BYE'
                      : `${
                          row.is_home
                            ? 'vs'
                            : '@'
                        } ${
                          row.opponent_abbreviation ||
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
                  }else if(kickedOff){
                    const ownScore=
                      row.is_home
                        ? row.home_score
                        : row.away_score

                    const opponentScore=
                      row.is_home
                        ? row.away_score
                        : row.home_score

                    gameDisplay=
                      `${ownScore ?? 0}-${opponentScore ?? 0}`
                  }else{
                    gameDisplay=
                      gameDateEastern(
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
                              gap:3,
                              color:'inherit',
                              textDecoration:'none',
                              fontWeight:700,
                              whiteSpace:'nowrap'
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
                                opponentText
                              }
                              size={20}
                            />

                            <span>
                              {opponentText}
                            </span>
                          </Link>
                        ) : (
                          <div
                            style={{
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center',
                              gap:3,
                              fontWeight:700,
                              whiteSpace:'nowrap'
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
                                opponentText
                              }
                              size={20}
                            />

                            <span>
                              {opponentText}
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
                              padding:'4px 4px',
                              borderRadius:8,
                              border:
                                `2px solid ${
                                  color ||
                                  '#555'
                                }`,
                              color:
                                color ||
                                'inherit',
                              fontWeight:800,
                              whiteSpace:'nowrap',
                              fontSize:'0.7rem'
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
                            kickedOff
                              ? 800
                              : 600,
                          fontSize:
                            kickedOff
                              ? '0.76rem'
                              : '0.72rem'
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

        <p
          className="muted"
          style={{
            textAlign:'center',
            fontSize:'0.7rem',
            marginTop:12,
            marginBottom:0
          }}
        >
          Selections reveal at kickoff.
          Results and records update automatically.
        </p>
      </section>

    </main>
  )
}