 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'

const championshipPayouts:Record<number,number>={
  1:250,
  2:200,
  3:175,
  4:150,
  5:125,
  6:100,
  7:75,
  8:50
}

const consolationPayouts:Record<number,number>={
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
  if(n>0) return `+$${n}`
  if(n<0) return `-$${Math.abs(n)}`
  return '$0'
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

export default async function Playoffs(){
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
      (seedState||[]).find(
        (s:any)=>
          Number(s.division)===division &&
          Number(s.seed)===seed
      )

    if(!state){
      return null
    }

    return (
      squadMap.get(
        Number(state.squad_id)
      )?.squad_name
      || null
    )
  }

  const seedLabel=(
    division:number,
    seed:number
  )=>{
    return (
      lockedSeed(
        division,
        seed
      )
      ||
      `${divisionName(division)} ${ordinal(seed)} Place`
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
          Division positions populate with squad names
          only when that exact seed is mathematically locked.
        </p>
      </section>

      <PlayoffMatrix
        title="Championship Playoff Matrix"
        seedA={1}
        seedB={2}
        week16Band="1-4"
        upperBand="1-4"
        lowerBand="5-8"
        firstPlace={1}
        payouts={championshipPayouts}
        seedLabel={seedLabel}
        getMatch={getMatch}
        championLabel
      />

      <PlayoffMatrix
        title="Consolation Playoff Matrix"
        seedA={3}
        seedB={4}
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
                <th style={{textAlign:'center'}}>
                  Place
                </th>

                <th style={{textAlign:'center'}}>
                  Squad
                </th>

                <th style={{textAlign:'center'}}>
                  Payout
                </th>
              </tr>
            </thead>

            <tbody>
              {placements.map(
                (p:any)=>(
                  <tr
                    key={p.final_place}
                  >
                    <td style={{textAlign:'center'}}>
                      {ordinal(
                        Number(
                          p.final_place
                        )
                      )}
                    </td>

                    <td style={{textAlign:'center'}}>
                      {p.squads?.squad_name}
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

function PlayoffMatrix({
  title,
  seedA,
  seedB,
  week16Band,
  upperBand,
  lowerBand,
  firstPlace,
  payouts,
  seedLabel,
  getMatch,
  championLabel=false
}:{
  title:string
  seedA:number
  seedB:number
  week16Band:string
  upperBand:string
  lowerBand:string
  firstPlace:number
  payouts:Record<number,number>
  seedLabel:(division:number,seed:number)=>string
  getMatch:(week:number,band:string,slot:number)=>any
  championLabel?:boolean
}){
  const g1=getMatch(16,week16Band,1)
  const g2=getMatch(16,week16Band,2)
  const g3=getMatch(16,week16Band,3)
  const g4=getMatch(16,week16Band,4)

  const g5=getMatch(17,upperBand,1)
  const g6=getMatch(17,upperBand,2)

  const g7=getMatch(17,lowerBand,1)
  const g8=getMatch(17,lowerBand,2)

  const g9=getMatch(18,upperBand,1)
  const g10=getMatch(18,upperBand,2)

  const g11=getMatch(18,lowerBand,1)
  const g12=getMatch(18,lowerBand,2)

  return (
    <section
      className="card"
      style={{
        paddingBottom:24
      }}
    >
      <h2
        style={{
          textAlign:'center',
          textDecoration:'underline',
          marginBottom:22
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
            minWidth:1080
          }}
        >
          <div
            style={{
              display:'grid',
              gridTemplateColumns:
                '290px 250px 250px 220px',
              columnGap:32,
              textAlign:'center',
              fontWeight:700,
              marginBottom:20
            }}
          >
            <div>
              Week #16
            </div>

            <div>
              Week #17
            </div>

            <div>
              Week #18
            </div>

            <div>
              Final Place
            </div>
          </div>

          <div
            style={{
              display:'grid',
              gridTemplateColumns:
                '290px 250px 250px 220px',
              columnGap:32
            }}
          >

            {/* WEEK 16 */}

            <div
              style={{
                display:'grid',
                gap:24
              }}
            >
              <SeedGame
                gameNumber={1}
                a={
                  g1?.squad_a?.squad_name
                  || seedLabel(1,seedA)
                }
                b={
                  g1?.squad_b?.squad_name
                  || seedLabel(1,seedB)
                }
                match={g1}
              />

              <SeedGame
                gameNumber={2}
                a={
                  g2?.squad_a?.squad_name
                  || seedLabel(2,seedA)
                }
                b={
                  g2?.squad_b?.squad_name
                  || seedLabel(2,seedB)
                }
                match={g2}
              />

              <SeedGame
                gameNumber={3}
                a={
                  g3?.squad_a?.squad_name
                  || seedLabel(3,seedA)
                }
                b={
                  g3?.squad_b?.squad_name
                  || seedLabel(3,seedB)
                }
                match={g3}
              />

              <SeedGame
                gameNumber={4}
                a={
                  g4?.squad_a?.squad_name
                  || seedLabel(4,seedA)
                }
                b={
                  g4?.squad_b?.squad_name
                  || seedLabel(4,seedB)
                }
                match={g4}
              />
            </div>

            {/* WEEK 17 */}

            <div
              style={{
                display:'grid',
                gap:34,
                paddingTop:42
              }}
            >
              <FlowGame
                gameNumber={5}
                a={
                  g5?.squad_a?.squad_name
                  || 'Game #1 Winner'
                }
                b={
                  g5?.squad_b?.squad_name
                  || 'Game #2 Winner'
                }
                match={g5}
              />

              <FlowGame
                gameNumber={6}
                a={
                  g6?.squad_a?.squad_name
                  || 'Game #3 Winner'
                }
                b={
                  g6?.squad_b?.squad_name
                  || 'Game #4 Winner'
                }
                match={g6}
              />

              <FlowGame
                gameNumber={7}
                a={
                  g7?.squad_a?.squad_name
                  || 'Game #1 Loser'
                }
                b={
                  g7?.squad_b?.squad_name
                  || 'Game #2 Loser'
                }
                match={g7}
              />

              <FlowGame
                gameNumber={8}
                a={
                  g8?.squad_a?.squad_name
                  || 'Game #3 Loser'
                }
                b={
                  g8?.squad_b?.squad_name
                  || 'Game #4 Loser'
                }
                match={g8}
              />
            </div>

            {/* WEEK 18 */}

            <div
              style={{
                display:'grid',
                gap:34,
                paddingTop:84
              }}
            >
              <FlowGame
                gameNumber={9}
                a={
                  g9?.squad_a?.squad_name
                  || 'Game #5 Winner'
                }
                b={
                  g9?.squad_b?.squad_name
                  || 'Game #6 Winner'
                }
                match={g9}
              />

              <FlowGame
                gameNumber={10}
                a={
                  g10?.squad_a?.squad_name
                  || 'Game #5 Loser'
                }
                b={
                  g10?.squad_b?.squad_name
                  || 'Game #6 Loser'
                }
                match={g10}
              />

              <FlowGame
                gameNumber={11}
                a={
                  g11?.squad_a?.squad_name
                  || 'Game #7 Winner'
                }
                b={
                  g11?.squad_b?.squad_name
                  || 'Game #8 Winner'
                }
                match={g11}
              />

              <FlowGame
                gameNumber={12}
                a={
                  g12?.squad_a?.squad_name
                  || 'Game #7 Loser'
                }
                b={
                  g12?.squad_b?.squad_name
                  || 'Game #8 Loser'
                }
                match={g12}
              />
            </div>

            {/* FINAL RESULTS */}

            <div
              style={{
                display:'grid',
                gap:24,
                paddingTop:78
              }}
            >
              <FinalPair
                match={g9}
                winnerPlace={firstPlace}
                loserPlace={firstPlace+1}
                payouts={payouts}
                championLabel={championLabel}
              />

              <FinalPair
                match={g10}
                winnerPlace={firstPlace+2}
                loserPlace={firstPlace+3}
                payouts={payouts}
              />

              <FinalPair
                match={g11}
                winnerPlace={firstPlace+4}
                loserPlace={firstPlace+5}
                payouts={payouts}
              />

              <FinalPair
                match={g12}
                winnerPlace={firstPlace+6}
                loserPlace={firstPlace+7}
                payouts={payouts}
              />
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

function SeedGame({
  gameNumber,
  a,
  b,
  match
}:{
  gameNumber:number
  a:string
  b:string
  match:any
}){
  return (
    <BracketGame
      gameNumber={gameNumber}
      a={a}
      b={b}
      match={match}
    />
  )
}

function FlowGame({
  gameNumber,
  a,
  b,
  match
}:{
  gameNumber:number
  a:string
  b:string
  match:any
}){
  return (
    <BracketGame
      gameNumber={gameNumber}
      a={a}
      b={b}
      match={match}
    />
  )
}

function BracketGame({
  gameNumber,
  a,
  b,
  match
}:{
  gameNumber:number
  a:string
  b:string
  match:any
}){
  const winner=
    match?.winner?.squad_name

  return (
    <div
      style={{
        position:'relative',
        paddingRight:22
      }}
    >
      <div
        style={{
          fontSize:'0.74rem',
          fontWeight:700,
          marginBottom:4
        }}
      >
        Game #{gameNumber}
      </div>

      <div
        style={{
          minHeight:30,
          display:'flex',
          alignItems:'end'
        }}
      >
        <div
          style={{
            width:'100%',
            borderBottom:'2px solid #555',
            padding:'0 4px 3px',
            fontWeight:
              winner===a
                ? 800
                : 500
          }}
        >
          {a}
        </div>
      </div>

      <div
        style={{
          minHeight:34,
          display:'flex',
          alignItems:'end'
        }}
      >
        <div
          style={{
            width:'100%',
            borderBottom:'2px solid #555',
            padding:'0 4px 3px',
            fontWeight:
              winner===b
                ? 800
                : 500
          }}
        >
          {b}
        </div>
      </div>

      <div
        style={{
          position:'absolute',
          right:0,
          top:26,
          width:22,
          height:36,
          borderRight:'2px solid #555',
          borderTop:'2px solid #555',
          borderBottom:'2px solid #555'
        }}
      />

      {match?.status==='needs_tiebreaker' && (
        <div
          style={{
            marginTop:4,
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

function FinalPair({
  match,
  winnerPlace,
  loserPlace,
  payouts,
  championLabel=false
}:{
  match:any
  winnerPlace:number
  loserPlace:number
  payouts:Record<number,number>
  championLabel?:boolean
}){
  const winnerName=
    match?.winner?.squad_name
    || (
      championLabel
        ? 'SQUADS Bowl Champion!'
        : `${ordinal(winnerPlace)} Place`
    )

  const loserName=
    match?.loser?.squad_name
    || `${ordinal(loserPlace)} Place`

  return (
    <div
      style={{
        display:'grid',
        gap:16
      }}
    >
      <FinishLine
        name={winnerName}
        place={winnerPlace}
        payout={payouts[winnerPlace]}
        champion={
          championLabel &&
          winnerPlace===1
        }
      />

      <FinishLine
        name={loserName}
        place={loserPlace}
        payout={payouts[loserPlace]}
      />
    </div>
  )
}

function FinishLine({
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
    <div>
      <div
        style={{
          borderBottom:'2px solid #555',
          padding:'0 4px 4px',
          textAlign:'center',
          fontWeight:champion?800:700
        }}
      >
        {name}
      </div>

      <div
        style={{
          textAlign:'center',
          fontSize:'0.78rem',
          marginTop:3
        }}
      >
        {ordinal(place)}
        {' · '}
        <b>
          {money(payout)}
        </b>
      </div>
    </div>
  )
}