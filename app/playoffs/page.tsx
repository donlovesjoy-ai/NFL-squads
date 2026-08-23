 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'

const championshipPayouts={
  1:250,
  2:200,
  3:175,
  4:150,
  5:125,
  6:100,
  7:75,
  8:50
}

const consolationPayouts={
  9:-50,
  10:-75,
  11:-100,
  12:-125,
  13:-150,
  14:-175,
  15:-200,
  16:-250
}

function money(n:number){
  return n>0
    ? `+$${n}`
    : n<0
      ? `-$${Math.abs(n)}`
      : '$0'
}

export default async function Playoffs(){
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
    {data:matches},
    {data:placements},
    {data:seedState},
    {data:squads},
    {data:divisionNames}
  ]=await Promise.all([

    supabase
      .from('playoff_matchups')
      .select(`
        id,
        nfl_week,
        bracket_band,
        round_name,
        matchup_slot,
        status,
        final_place_winner,
        final_place_loser,

        squad_a:
          squads!playoff_matchups_squad_a_id_fkey(
            squad_name
          ),

        squad_b:
          squads!playoff_matchups_squad_b_id_fkey(
            squad_name
          ),

        winner:
          squads!playoff_matchups_winner_squad_id_fkey(
            squad_name
          ),

        loser:
          squads!playoff_matchups_loser_squad_id_fkey(
            squad_name
          )
      `)
      .eq('season_year',2026)
      .order('nfl_week')
      .order('bracket_band')
      .order('matchup_slot'),

    supabase
      .from('final_placements')
      .select(`
        final_place,
        payout,
        squads(
          squad_name
        )
      `)
      .eq('season_year',2026)
      .order('final_place'),

    supabase
      .from('division_seed_state')
      .select(`
        division,
        seed,
        squad_id,
        locked_at
      `)
      .eq('season_year',2026),

    supabase
      .from('squads')
      .select(`
        id,
        squad_name,
        division
      `)
      .eq('season_year',2026),

    supabase
      .from('division_names')
      .select(`
        division,
        division_name
      `)
      .eq('season_year',2026)
      .order('division')
  ])

  const matchList=
    (matches||[]) as any[]

  const squadMap=
    new Map(
      (squads||[]).map(
        (s:any)=>[
          Number(s.id),
          s
        ]
      )
    )

  const divisionName=(division:number)=>{
    return (
      (divisionNames||[])
        .find(
          (d:any)=>
            Number(d.division)===division
        )
        ?.division_name
      || `Division ${division}`
    )
  }

  const lockedSeed=(
    division:number,
    seed:number
  )=>{
    const state=
      (seedState||[])
        .find(
          (s:any)=>
            Number(s.division)===division &&
            Number(s.seed)===seed
        )

    if(!state){
      return null
    }

    return squadMap.get(
      Number(state.squad_id)
    )?.squad_name || null
  }

  const seedLabel=(
    division:number,
    seed:number
  )=>{
    return (
      lockedSeed(division,seed)
      || `${divisionName(division)} ${ordinal(seed)} Place`
    )
  }

  const getMatch=(
    week:number,
    band:string,
    slot:number
  )=>{
    return matchList.find(
      (m:any)=>
        Number(m.nfl_week)===week &&
        m.bracket_band===band &&
        Number(m.matchup_slot)===slot
    )
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
            2026 Playoffs
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
          Playoff Matrix
        </h1>

        <p className="muted">
          Division seeds populate automatically
          once that exact finishing position is
          mathematically secured.
        </p>
      </section>

      <Matrix
        title="Championship Playoff Matrix"
        seedStart={1}
        week16Band="1-4"
        upperBand="1-4"
        lowerBand="5-8"
        firstPlace={1}
        payouts={championshipPayouts}
        seedLabel={seedLabel}
        getMatch={getMatch}
      />

      <Matrix
        title="Consolation Playoff Matrix"
        seedStart={3}
        week16Band="9-12"
        upperBand="9-12"
        lowerBand="13-16"
        firstPlace={9}
        payouts={consolationPayouts}
        seedLabel={seedLabel}
        getMatch={getMatch}
      />

      {placements &&
       placements.length>0 && (

        <section
          className="card"
          style={{
            textAlign:'center'
          }}
        >
          <h2>
            Final Placements & Payouts
          </h2>

          <table
            style={{
              width:'100%',
              textAlign:'center'
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign:'center'
                  }}
                >
                  Place
                </th>

                <th
                  style={{
                    textAlign:'center'
                  }}
                >
                  Squad
                </th>

                <th
                  style={{
                    textAlign:'center'
                  }}
                >
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
                        textAlign:'center'
                      }}
                    >
                      {ordinal(
                        Number(
                          p.final_place
                        )
                      )}
                    </td>

                    <td
                      style={{
                        textAlign:'center'
                      }}
                    >
                      {
                        p.squads
                          ?.squad_name
                      }
                    </td>

                    <td
                      style={{
                        textAlign:'center',
                        fontWeight:700
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
        </section>
      )}

    </main>
  )
}

function Matrix({
  title,
  seedStart,
  week16Band,
  upperBand,
  lowerBand,
  firstPlace,
  payouts,
  seedLabel,
  getMatch
}:{
  title:string
  seedStart:number
  week16Band:string
  upperBand:string
  lowerBand:string
  firstPlace:number
  payouts:Record<number,number>
  seedLabel:(division:number,seed:number)=>string
  getMatch:(week:number,band:string,slot:number)=>any
}){
  const w16=[
    getMatch(16,week16Band,1),
    getMatch(16,week16Band,2),
    getMatch(16,week16Band,3),
    getMatch(16,week16Band,4)
  ]

  const w17=[
    getMatch(17,upperBand,1),
    getMatch(17,upperBand,2),
    getMatch(17,lowerBand,1),
    getMatch(17,lowerBand,2)
  ]

  const w18=[
    getMatch(18,upperBand,1),
    getMatch(18,upperBand,2),
    getMatch(18,lowerBand,1),
    getMatch(18,lowerBand,2)
  ]

  return (
    <section className="card">

      <h2
        style={{
          textAlign:'center',
          textDecoration:'underline',
          marginBottom:20
        }}
      >
        {title}
      </h2>

      <div
        style={{
          overflowX:'auto'
        }}
      >
        <div
          style={{
            minWidth:980,
            padding:'0 10px 20px'
          }}
        >

          <div
            style={{
              display:'grid',
              gridTemplateColumns:
                '260px 240px 240px 180px',
              gap:28,
              textAlign:'center',
              marginBottom:14,
              fontWeight:700
            }}
          >
            <div>
              Week 16
            </div>

            <div>
              Week 17
            </div>

            <div>
              Week 18
            </div>

            <div>
              Final Place
            </div>
          </div>

          <div
            style={{
              display:'grid',
              gridTemplateColumns:
                '260px 240px 240px 180px',
              gap:28,
              alignItems:'stretch'
            }}
          >

            <div
              style={{
                display:'grid',
                gap:18
              }}
            >
              {[1,2,3,4].map(
                (division,index)=>{

                  const match=
                    w16[index]

                  const a=
                    match?.squad_a
                      ?.squad_name
                    || seedLabel(
                      division,
                      seedStart
                    )

                  const b=
                    match?.squad_b
                      ?.squad_name
                    || seedLabel(
                      division,
                      seedStart+1
                    )

                  return (
                    <MatchBox
                      key={division}
                      label={`Game #${index+1}`}
                      a={a}
                      b={b}
                      match={match}
                    />
                  )
                }
              )}
            </div>

            <div
              style={{
                display:'grid',
                gap:30,
                paddingTop:38
              }}
            >
              <MatchBox
                label="Game #5"
                a={
                  w17[0]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #1 Winner'
                }
                b={
                  w17[0]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #2 Winner'
                }
                match={w17[0]}
              />

              <MatchBox
                label="Game #6"
                a={
                  w17[1]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #3 Winner'
                }
                b={
                  w17[1]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #4 Winner'
                }
                match={w17[1]}
              />

              <MatchBox
                label="Game #7"
                a={
                  w17[2]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #1 Loser'
                }
                b={
                  w17[2]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #2 Loser'
                }
                match={w17[2]}
              />

              <MatchBox
                label="Game #8"
                a={
                  w17[3]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #3 Loser'
                }
                b={
                  w17[3]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #4 Loser'
                }
                match={w17[3]}
              />
            </div>

            <div
              style={{
                display:'grid',
                gap:30,
                paddingTop:78
              }}
            >
              <MatchBox
                label="Game #9"
                a={
                  w18[0]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #5 Winner'
                }
                b={
                  w18[0]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #6 Winner'
                }
                match={w18[0]}
              />

              <MatchBox
                label="Game #10"
                a={
                  w18[1]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #5 Loser'
                }
                b={
                  w18[1]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #6 Loser'
                }
                match={w18[1]}
              />

              <MatchBox
                label="Game #11"
                a={
                  w18[2]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #7 Winner'
                }
                b={
                  w18[2]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #8 Winner'
                }
                match={w18[2]}
              />

              <MatchBox
                label="Game #12"
                a={
                  w18[3]
                    ?.squad_a
                    ?.squad_name
                  || 'Game #7 Loser'
                }
                b={
                  w18[3]
                    ?.squad_b
                    ?.squad_name
                  || 'Game #8 Loser'
                }
                match={w18[3]}
              />
            </div>

            <div
              style={{
                display:'grid',
                gap:16,
                paddingTop:78
              }}
            >
              {[0,1,2,3].map(
                index=>{

                  const winnerPlace=
                    firstPlace+
                    index*2

                  const loserPlace=
                    winnerPlace+1

                  const match=
                    w18[index]

                  const winner=
                    match?.winner
                      ?.squad_name
                    || (
                      index===0
                        ? (
                          firstPlace===1
                            ? 'SQUADS Bowl Champion'
                            : `${ordinal(winnerPlace)} Place`
                        )
                        : `${ordinal(winnerPlace)} Place`
                    )

                  const loser=
                    match?.loser
                      ?.squad_name
                    || `${ordinal(loserPlace)} Place`

                  return (
                    <div
                      key={index}
                      style={{
                        display:'grid',
                        gap:10
                      }}
                    >
                      <PlaceBox
                        name={winner}
                        place={winnerPlace}
                        payout={
                          payouts[
                            winnerPlace
                          ]
                        }
                        champion={
                          winnerPlace===1
                        }
                      />

                      <PlaceBox
                        name={loser}
                        place={loserPlace}
                        payout={
                          payouts[
                            loserPlace
                          ]
                        }
                      />
                    </div>
                  )
                }
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

function MatchBox({
  label,
  a,
  b,
  match
}:{
  label:string
  a:string
  b:string
  match:any
}){
  const winner=
    match?.winner
      ?.squad_name

  return (
    <div
      style={{
        position:'relative',
        border:'1px solid #bbb',
        borderRadius:8,
        padding:'8px 10px',
        minHeight:84,
        display:'grid',
        alignContent:'center',
        background:'#fff'
      }}
    >
      <div
        className="muted"
        style={{
          fontSize:'0.72rem',
          marginBottom:4,
          textAlign:'center'
        }}
      >
        {label}
      </div>

      <div
        style={{
          borderBottom:
            '1px solid #ddd',
          padding:'4px 2px',
          fontWeight:
            winner===a
              ? 700
              : 500
        }}
      >
        {a}
      </div>

      <div
        style={{
          padding:'4px 2px',
          fontWeight:
            winner===b
              ? 700
              : 500
        }}
      >
        {b}
      </div>

      {match?.status===
       'needs_tiebreaker' && (
        <div
          style={{
            marginTop:5,
            fontSize:'0.7rem',
            fontWeight:700
          }}
        >
          Tiebreaker required
        </div>
      )}
    </div>
  )
}

function PlaceBox({
  name,
  place,
  payout,
  champion=false
}:{
  name:string
  place:number
  payout:number
  champion?:boolean
}){
  return (
    <div
      style={{
        borderBottom:
          '2px solid #555',
        padding:'5px 4px',
        textAlign:'center'
      }}
    >
      <div
        style={{
          fontWeight:
            champion
              ? 800
              : 700
        }}
      >
        {name}
      </div>

      <div
        style={{
          fontSize:'0.78rem',
          marginTop:2
        }}
      >
        {ordinal(place)}
        {' · '}
        <span
          style={{
            fontWeight:800
          }}
        >
          {money(payout)}
        </span>
      </div>
    </div>
  )
}

function ordinal(n:number){
  const mod100=n%100

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