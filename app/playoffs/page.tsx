 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'

function money(
  n:number
){
  if(n>0){
    return `+$${n}`
  }

  if(n<0){
    return `-$${Math.abs(n)}`
  }

  return '$0'
}

function ordinal(
  n:number
){
  const mod100=
    n%100

  if(
    mod100>=11 &&
    mod100<=13
  ){
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

function signed(
  n:any
){
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

function resultStyle(
  result:any
){
  const r=
    String(
      result||''
    ).toUpperCase()

  if(r==='W'){
    return {
      label:'WIN',
      color:'green'
    }
  }

  if(r==='P'){
    return {
      label:'PUSH',
      color:'#1565c0'
    }
  }

  if(r==='L'){
    return {
      label:'LOSS',
      color:'red'
    }
  }

  return {
    label:'—',
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

export default async function Playoffs(){
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
      .eq(
        'id',
        user.id
      )
      .maybeSingle()

  const commissioner=
    profile?.role===
    'commissioner'

  if(!commissioner){
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
            id,
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
            id,
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

  const championship=
    rows.filter(
      (r:any)=>
        r.bracket_type===
        'championship'
    )

  const consolation=
    rows.filter(
      (r:any)=>
        r.bracket_type===
        'consolation'
    )

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
            2026 Playoffs
          </div>
        </div>
      </div>

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
            fontSize:'0.72rem',
            fontWeight:900,
            letterSpacing:'0.12em',
            textTransform:'uppercase',
            opacity:0.6,
            marginBottom:5
          }}
        >
          Postseason
        </div>

        <h1>
          NFL Squads Playoffs
        </h1>

        <p>
          <b>
            Win → Push → Loss
          </b>
        </p>

        <p className="muted">
          First tiebreaker:
          closest Game Total prediction.
          Second tiebreaker:
          season ATS margin.
        </p>

        <p
          style={{
            fontWeight:900
          }}
        >
          Championship and Consolation brackets
          use the same 8 → 4 → 2 format.
        </p>
      </section>

      <BracketSection
        title="Championship Bracket"
        subtitle="Division 1st & 2nd Place Squads · Final Places 1–8"
        entries={championship}
      />

      <BracketSection
        title="Consolation Bracket"
        subtitle="Division 3rd & 4th Place Squads · Final Places 9–16"
        entries={consolation}
      />

      {placements &&
       placements.length>0 && (
        <section
          className="card"
        >
          <h2
            style={{
              textAlign:'center'
            }}
          >
            Final Placements & Payouts
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
                {placements.map(
                  (p:any)=>(
                    <tr
                      key={
                        p.final_place
                      }
                    >
                      <td
                        style={{
                          fontWeight:900
                        }}
                      >
                        {ordinal(
                          Number(
                            p.final_place
                          )
                        )}
                      </td>

                      <td>
                        <div
                          style={{
                            display:'flex',
                            justifyContent:'center',
                            alignItems:'center',
                            gap:7
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
                            size={28}
                          />

                          <b>
                            {
                              p.squads
                                ?.squad_name
                            }
                          </b>
                        </div>
                      </td>

                      <td
                        style={{
                          fontWeight:900
                        }}
                      >
                        {money(
                          Number(
                            p.payout
                          )
                        )}
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

function BracketSection({
  title,
  subtitle,
  entries
}:{
  title:string
  subtitle:string
  entries:any[]
}){
  const weeks=[
    16,
    17,
    18
  ]

  return (
    <section
      className="card"
    >
      <div
        style={{
          textAlign:'center',
          marginBottom:18
        }}
      >
        <h2
          style={{
            marginBottom:5
          }}
        >
          {title}
        </h2>

        <div
          className="muted"
          style={{
            fontSize:'0.82rem'
          }}
        >
          {subtitle}
        </div>
      </div>

      {entries.length===0 ? (
        <p
          className="muted"
          style={{
            textAlign:'center'
          }}
        >
          Playoff field has not been initialized yet.
        </p>
      ) : (
        weeks.map(
          week=>{

            const weekRows=
              entries.filter(
                (r:any)=>
                  Number(
                    r.nfl_week
                  )===week
              )

            if(
              weekRows.length===0
            ){
              return null
            }

            const groups=[
              ...new Set(
                weekRows.map(
                  (r:any)=>
                    r.group_code
                )
              )
            ]

            return (
              <div
                key={week}
                style={{
                  marginBottom:28
                }}
              >
                <div
                  style={{
                    textAlign:'center',
                    fontWeight:900,
                    fontSize:'1rem',
                    marginBottom:10
                  }}
                >
                  Week {week}
                </div>

                {groups.map(
                  code=>{

                    const groupRows=
                      weekRows
                        .filter(
                          (r:any)=>
                            r.group_code===
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
                      <GroupCard
                        key={code}
                        title={
                          groupTitle(
                            code
                          )
                        }
                        rows={
                          groupRows
                        }
                      />
                    )
                  }
                )}
              </div>
            )
          }
        )
      )}
    </section>
  )
}

function GroupCard({
  title,
  rows
}:{
  title:string
  rows:any[]
}){
  return (
    <div
      style={{
        border:
          '1px solid rgba(120,120,120,0.25)',
        borderRadius:10,
        overflow:'hidden',
        marginBottom:14
      }}
    >
      <div
        style={{
          textAlign:'center',
          fontWeight:900,
          padding:'9px 8px',
          borderBottom:
            '1px solid rgba(120,120,120,0.2)'
        }}
      >
        {title}
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
            tableLayout:'fixed',
            fontSize:'0.82rem'
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
                Total
              </th>

              <th>
                Diff
              </th>

              <th>
                ATS
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (r:any)=>{

                const result=
                  resultStyle(
                    r.result_code
                  )

                return (
                  <tr
                    key={r.id}
                  >
                    <td
                      style={{
                        fontWeight:900
                      }}
                    >
                      {r.group_rank
                        ?? '—'}
                    </td>

                    <td>
                      <div
                        style={{
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:5
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
                      {result.label}
                    </td>

                    <td>
                      {
                        r.game_total_prediction
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

      {rows.some(
        (r:any)=>
          r.status===
          'needs_tiebreaker'
      ) && (
        <div
          className="status"
          style={{
            textAlign:'center',
            margin:10
          }}
        >
          Exact tie remains after all
          three playoff ranking criteria.
        </div>
      )}
    </div>
  )
}