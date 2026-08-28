 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'
import SquadLogo from '../../components/SquadLogo'
import {
  initialize,
  grade16,
  grade17,
  grade18
} from './actions'

function signed(n:any){
  if(
    n===null ||
    n===undefined
  ){
    return '—'
  }

  const x=
    Number(n)

  return x>0
    ? `+${x}`
    : `${x}`
}

function resultLabel(
  result:any
){
  const r=
    String(
      result||''
    ).toUpperCase()

  if(r==='W'){
    return {
      text:'W',
      color:'green'
    }
  }

  if(r==='P'){
    return {
      text:'P',
      color:'#1565c0'
    }
  }

  if(r==='L'){
    return {
      text:'L',
      color:'red'
    }
  }

  return {
    text:'—',
    color:'inherit'
  }
}

function groupTitle(
  code:string
){
  switch(code){
    case '1-8':
      return 'Places 1–8'

    case '9-16':
      return 'Places 9–16'

    case '1-4':
      return 'Places 1–4'

    case '5-8':
      return 'Places 5–8'

    case '9-12':
      return 'Places 9–12'

    case '13-16':
      return 'Places 13–16'

    case '1-2':
      return 'SQUADS Bowl'

    case '3-4':
      return '3rd Place Game'

    case '5-6':
      return '5th Place Game'

    case '7-8':
      return '7th Place Game'

    case '9-10':
      return '9th Place Game'

    case '11-12':
      return '11th Place Game'

    case '13-14':
      return '13th Place Game'

    case '15-16':
      return '15th Place Game'

    default:
      return code
  }
}

export default async function CommissionerPlayoffs({
  searchParams
}:{
  searchParams:Promise<{
    ok?:string
    error?:string
  }>
}){
  const sp=
    await searchParams

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

  const {data:profile}=
    await supabase
      .from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle()

  if(
    profile?.role!=='commissioner'
  ){
    redirect('/dashboard')
  }

  const [
    {data:entries},
    {data:placements}
  ]=
    await Promise.all([

      supabase
        .from(
          'playoff_round_entries'
        )
        .select(`
          id,
          nfl_week,
          bracket_type,
          group_code,
          squad_id,
          result_code,
          game_total_prediction,
          actual_game_total,
          total_error,
          season_ats_margin,
          group_rank,
          final_place,
          status,

          squads(
            squad_name,
            logo_path,
            nfl_teams(
              abbreviation
            )
          )
        `)
        .eq(
          'season_year',
          2026
        )
        .order(
          'nfl_week',
          {
            ascending:true
          }
        )
        .order(
          'bracket_type',
          {
            ascending:true
          }
        )
        .order(
          'group_code',
          {
            ascending:true
          }
        )
        .order(
          'group_rank',
          {
            ascending:true,
            nullsFirst:false
          }
        ),

      supabase
        .from(
          'final_placements'
        )
        .select(`
          final_place,
          payout,

          squads(
            squad_name,
            logo_path,
            nfl_teams(
              abbreviation
            )
          )
        `)
        .eq(
          'season_year',
          2026
        )
        .order(
          'final_place'
        )
    ])

  const rows=
    (entries||[]) as any[]

  const weeks=[
    16,
    17,
    18
  ]

  const entriesFor=(
    week:number,
    bracket:string
  )=>{
    return rows.filter(
      (r:any)=>
        Number(
          r.nfl_week
        )===week &&
        r.bracket_type===
          bracket
    )
  }

  const hasWeek16=
    rows.some(
      (r:any)=>
        Number(
          r.nfl_week
        )===16
    )

  const hasWeek17=
    rows.some(
      (r:any)=>
        Number(
          r.nfl_week
        )===17
    )

  const hasWeek18=
    rows.some(
      (r:any)=>
        Number(
          r.nfl_week
        )===18
    )

  const finalCount=
    placements?.length||0

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
            Commissioner Playoffs
          </div>
        </div>
      </div>

      <Nav commissioner/>

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h1>
          Revised Playoff Control
        </h1>

        <p>
          Rankings:
          {' '}
          <b>
            Win → Push → Loss
          </b>
          {' · '}
          Closest Game Total
          {' · '}
          Season ATS
        </p>

        <p className="muted">
          Championship and Consolation brackets
          use the same 8 → 4 → 2 format.
        </p>

        {sp.ok && (
          <p className="status">
            Playoff action completed.
          </p>
        )}

        {sp.error && (
          <p className="status">
            Unable to complete playoff action:
            {' '}
            {sp.error}
          </p>
        )}
      </section>

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h2>
          Commissioner Actions
        </h2>

        <div
          style={{
            display:'flex',
            gap:10,
            justifyContent:'center',
            flexWrap:'wrap'
          }}
        >
          <form action={initialize}>
            <button
              className="submit"
              type="submit"
            >
              Initialize Playoffs
            </button>
          </form>

          <form action={grade16}>
            <button
              className="submit"
              type="submit"
              disabled={!hasWeek16}
            >
              Grade Week 16
            </button>
          </form>

          <form action={grade17}>
            <button
              className="submit"
              type="submit"
              disabled={!hasWeek17}
            >
              Grade Week 17
            </button>
          </form>

          <form action={grade18}>
            <button
              className="submit"
              type="submit"
              disabled={!hasWeek18}
            >
              Grade Week 18
            </button>
          </form>
        </div>

        <p
          className="muted"
          style={{
            marginTop:14,
            fontSize:'0.82rem'
          }}
        >
          Grading Week 16 automatically creates
          Week 17 groups. Grading Week 17 creates
          Week 18 placement groups. Grading Week 18
          creates final places 1–16.
        </p>
      </section>

      {weeks.map(
        week=>{

          const championship=
            entriesFor(
              week,
              'championship'
            )

          const consolation=
            entriesFor(
              week,
              'consolation'
            )

          if(
            championship.length===0 &&
            consolation.length===0
          ){
            return null
          }

          return (
            <section
              className="card"
              key={week}
            >
              <h2
                style={{
                  textAlign:'center'
                }}
              >
                Week {week}
              </h2>

              <PlayoffGroups
                title="Championship Bracket"
                entries={
                  championship
                }
              />

              <div
                style={{
                  height:24
                }}
              />

              <PlayoffGroups
                title="Consolation Bracket"
                entries={
                  consolation
                }
              />
            </section>
          )
        }
      )}

      {finalCount>0 && (
        <section
          className="card"
        >
          <h2
            style={{
              textAlign:'center'
            }}
          >
            Final Placements
          </h2>

          <div
            style={{
              overflowX:'auto'
            }}
          >
            <table
              style={{
                width:'100%',
                textAlign:'center'
              }}
            >
              <thead>
                <tr>
                  <th>
                    Place
                  </th>

                  <th>
                    Squad
                  </th>

                  <th>
                    Payout
                  </th>
                </tr>
              </thead>

              <tbody>
                {(placements||[]).map(
                  (p:any)=>(
                    <tr
                      key={
                        p.final_place
                      }
                    >
                      <td>
                        {p.final_place}
                      </td>

                      <td>
                        <div
                          style={{
                            display:'flex',
                            justifyContent:'center',
                            alignItems:'center',
                            gap:6
                          }}
                        >
                          <SquadLogo
                            logoPath={
                              p.squads
                                ?.logo_path
                            }
                            nflAbbreviation={
                              p.squads
                                ?.nfl_teams
                                ?.abbreviation
                            }
                            squadName={
                              p.squads
                                ?.squad_name
                            }
                            size={26}
                          />

                          <b>
                            {
                              p.squads
                                ?.squad_name
                            }
                          </b>
                        </div>
                      </td>

                      <td>
                        <b>
                          {Number(
                            p.payout
                          )>0
                            ? '+'
                            : ''}
                          ${p.payout}
                        </b>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </main>
  )
}

function PlayoffGroups({
  title,
  entries
}:{
  title:string
  entries:any[]
}){
  const groups=[
    ...new Set(
      entries.map(
        e=>e.group_code
      )
    )
  ]

  return (
    <div>
      <h3
        style={{
          textAlign:'center',
          marginBottom:12
        }}
      >
        {title}
      </h3>

      {groups.map(
        code=>{

          const groupRows=
            entries
              .filter(
                e=>
                  e.group_code===
                  code
              )
              .sort(
                (a:any,b:any)=>
                  (
                    Number(
                      a.group_rank||
                      999
                    )-
                    Number(
                      b.group_rank||
                      999
                    )
                  ) ||
                  (
                    Number(
                      a.squad_id
                    )-
                    Number(
                      b.squad_id
                    )
                  )
              )

          return (
            <div
              key={code}
              style={{
                marginBottom:20
              }}
            >
              <div
                style={{
                  textAlign:'center',
                  fontWeight:900,
                  marginBottom:7
                }}
              >
                {groupTitle(code)}
              </div>

              <div
                style={{
                  overflowX:'auto'
                }}
              >
                <table
                  style={{
                    width:'100%',
                    textAlign:'center',
                    fontSize:'0.86rem'
                  }}
                >
                  <thead>
                    <tr>
                      <th>
                        Rank
                      </th>

                      <th>
                        Squad
                      </th>

                      <th>
                        Result
                      </th>

                      <th>
                        Prediction
                      </th>

                      <th>
                        Actual
                      </th>

                      <th>
                        Difference
                      </th>

                      <th>
                        Season ATS
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupRows.map(
                      (r:any)=>{

                        const result=
                          resultLabel(
                            r.result_code
                          )

                        return (
                          <tr
                            key={r.id}
                          >
                            <td>
                              {r.group_rank
                                ?? '—'}
                            </td>

                            <td>
                              <div
                                style={{
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center',
                                  gap:6
                                }}
                              >
                                <SquadLogo
                                  logoPath={
                                    r.squads
                                      ?.logo_path
                                  }
                                  nflAbbreviation={
                                    r.squads
                                      ?.nfl_teams
                                      ?.abbreviation
                                  }
                                  squadName={
                                    r.squads
                                      ?.squad_name
                                  }
                                  size={24}
                                />

                                <b>
                                  {
                                    r.squads
                                      ?.squad_name
                                  }
                                </b>
                              </div>
                            </td>

                            <td
                              style={{
                                color:
                                  result.color,
                                fontWeight:900
                              }}
                            >
                              {result.text}
                            </td>

                            <td>
                              {
                                r.game_total_prediction
                                ?? '—'
                              }
                            </td>

                            <td>
                              {
                                r.actual_game_total
                                ?? '—'
                              }
                            </td>

                            <td>
                              {
                                r.total_error
                                ?? '—'
                              }
                            </td>

                            <td>
                              {signed(
                                r.season_ats_margin
                              )}
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {groupRows.some(
                (r:any)=>
                  r.status===
                  'needs_tiebreaker'
              ) && (
                <p
                  className="status"
                  style={{
                    textAlign:'center'
                  }}
                >
                  Exact tie remains after
                  result, Game Total and
                  season ATS.
                </p>
              )}
            </div>
          )
        }
      )}
    </div>
  )
}