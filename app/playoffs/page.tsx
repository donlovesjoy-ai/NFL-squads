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

function signedScore(n:any){
  if(
    n===null ||
    n===undefined
  ){
    return '—'
  }

  const x=Number(n)

  if(x>0){
    return `+${x}`
  }

  return `${x}`
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
    {data:divisionNames},
    {data:playoffPicks}
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
        squad_a_id,
        squad_b_id,
        winner_squad_id,
        loser_squad_id,
        final_place_winner,
        final_place_loser,

        squad_a:
          squads!playoff_matchups_squad_a_id_fkey(
            id,
            squad_name
          ),

        squad_b:
          squads!playoff_matchups_squad_b_id_fkey(
            id,
            squad_name
          ),

        winner:
          squads!playoff_matchups_winner_squad_id_fkey(
            id,
            squad_name
          ),

        loser:
          squads!playoff_matchups_loser_squad_id_fkey(
            id,
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
      .order('division'),

    supabase
      .from('picks')
      .select(`
        squad_id,
        ats_margin,
        games!inner(
          nfl_week,
          season_year
        )
      `)
      .eq('games.season_year',2026)
      .in('games.nfl_week',[16,17,18])
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

  const scoreMap=
    new Map<string,number|null>()

  for(
    const p of
    (playoffPicks||[]) as any[]
  ){
    const week=
      Number(
        p.games?.nfl_week
      )

    scoreMap.set(
      `${p.squad_id}:${week}`,
      p.ats_margin===null ||
      p.ats_margin===undefined
        ? null
        : Number(p.ats_margin)
    )
  }

  const getScore=(
    squadId:number|null|undefined,
    week:number
  )=>{
    if(!squadId){
      return null
    }

    return (
      scoreMap.get(
        `${squadId}:${week}`
      )
      ?? null
    )
  }

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
          Weekly ATS margin is the playoff score.
          Highest score advances.
        </p>

        <p className="muted">
          Exact division seeds populate automatically
          once mathematically locked.
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
        getScore={getScore}
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
        getScore={getScore}
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
  getScore,
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
  getScore:(
    squadId:number|null|undefined,
    week:number
  )=>number|null
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
        paddingBottom:28
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
            minWidth:1100,
            padding:'0 10px 12px'
          }}
        >
          <div
            style={{
              display:'grid',
              gridTemplateColumns:
                '290px 255px 255px 220px',
              columnGap:38,
              textAlign:'center',
              fontWeight:700,
              marginBottom:18
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
                '290px 255px 255px 220px',
              columnGap:38
            }}
          >

            <div
              style={{
                display:'grid',
                gap:24
              }}
            >
              <BracketGame
                gameNumber={1}
                week={16}
                a={
                  g1?.squad_a?.squad_name
                  || seedLabel(1,seedA)
                }
                b={
                  g1?.squad_b?.squad_name
                  || seedLabel(1,seedB)
                }
                aId={g1?.squad_a_id}
                bId={g1?.squad_b_id}
                match={g1}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={2}
                week={16}
                a={
                  g2?.squad_a?.squad_name
                  || seedLabel(2,seedA)
                }
                b={
                  g2?.squad_b?.squad_name
                  || seedLabel(2,seedB)
                }
                aId={g2?.squad_a_id}
                bId={g2?.squad_b_id}
                match={g2}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={3}
                week={16}
                a={
                  g3?.squad_a?.squad_name
                  || seedLabel(3,seedA)
                }
                b={
                  g3?.squad_b?.squad_name
                  || seedLabel(3,seedB)
                }
                aId={g3?.squad_a_id}
                bId={g3?.squad_b_id}
                match={g3}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={4}
                week={16}
                a={
                  g4?.squad_a?.squad_name
                  || seedLabel(4,seedA)
                }
                b={
                  g4?.squad_b?.squad_name
                  || seedLabel(4,seedB)
                }
                aId={g4?.squad_a_id}
                bId={g4?.squad_b_id}
                match={g4}
                getScore={getScore}
              />
            </div>

            <div
              style={{
                display:'grid',
                gap:34,
                paddingTop:44
              }}
            >
              <BracketGame
                gameNumber={5}
                week={17}
                a={
                  g5?.squad_a?.squad_name
                  || 'Game #1 Winner'
                }
                b={
                  g5?.squad_b?.squad_name
                  || 'Game #2 Winner'
                }
                aId={g5?.squad_a_id}
                bId={g5?.squad_b_id}
                match={g5}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={6}
                week={17}
                a={
                  g6?.squad_a?.squad_name
                  || 'Game #3 Winner'
                }
                b={
                  g6?.squad_b?.squad_name
                  || 'Game #4 Winner'
                }
                aId={g6?.squad_a_id}
                bId={g6?.squad_b_id}
                match={g6}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={7}
                week={17}
                a={
                  g7?.squad_a?.squad_name
                  || 'Game #1 Loser'
                }
                b={
                  g7?.squad_b?.squad_name
                  || 'Game #2 Loser'
                }
                aId={g7?.squad_a_id}
                bId={g7?.squad_b_id}
                match={g7}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={8}
                week={17}
                a={
                  g8?.squad_a?.squad_name
                  || 'Game #3 Loser'
                }
                b={
                  g8?.squad_b?.squad_name
                  || 'Game #4 Loser'
                }
                aId={g8?.squad_a_id}
                bId={g8?.squad_b_id}
                match={g8}
                getScore={getScore}
              />
            </div>

            <div
              style={{
                display:'grid',
                gap:34,
                paddingTop:88
              }}
            >
              <BracketGame
                gameNumber={9}
                week={18}
                a={
                  g9?.squad_a?.squad_name
                  || 'Game #5 Winner'
                }
                b={
                  g9?.squad_b?.squad_name
                  || 'Game #6 Winner'
                }
                aId={g9?.squad_a_id}
                bId={g9?.squad_b_id}
                match={g9}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={10}
                week={18}
                a={
                  g10?.squad_a?.squad_name
                  || 'Game #5 Loser'
                }
                b={
                  g10?.squad_b?.squad_name
                  || 'Game #6 Loser'
                }
                aId={g10?.squad_a_id}
                bId={g10?.squad_b_id}
                match={g10}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={11}
                week={18}
                a={
                  g11?.squad_a?.squad_name
                  || 'Game #7 Winner'
                }
                b={
                  g11?.squad_b?.squad_name
                  || 'Game #8 Winner'
                }
                aId={g11?.squad_a_id}
                bId={g11?.squad_b_id}
                match={g11}
                getScore={getScore}
              />

              <BracketGame
                gameNumber={12}
                week={18}
                a={
                  g12?.squad_a?.squad_name
                  || 'Game #7 Loser'
                }
                b={
                  g12?.squad_b?.squad_name
                  || 'Game #8 Loser'
                }
                aId={g12?.squad_a_id}
                bId={g12?.squad_b_id}
                match={g12}
                getScore={getScore}
              />
            </div>

            <div
              style={{
                display:'grid',
                gap:24,
                paddingTop:82
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

function BracketGame({
  gameNumber,
  week,
  a,
  b,
  aId,
  bId,
  match,
  getScore
}:{
  gameNumber:number
  week:number
  a:string
  b:string
  aId:number|null|undefined
  bId:number|null|undefined
  match:any
  getScore:(
    squadId:number|null|undefined,
    week:number
  )=>number|null
}){
  const aScore=
    getScore(
      aId,
      week
    )

  const bScore=
    getScore(
      bId,
      week
    )

  const winnerId=
    Number(
      match?.winner_squad_id
      || 0
    )

  const loserId=
    Number(
      match?.loser_squad_id
      || 0
    )

  const lineColor=(
    squadId:number|null|undefined
  )=>{
    if(!match || match.status!=='final'){
      return undefined
    }

    if(Number(squadId)===winnerId){
      return 'green'
    }

    if(Number(squadId)===loserId){
      return 'red'
    }

    return undefined
  }

  const aColor=
    lineColor(aId)

  const bColor=
    lineColor(bId)

  return (
    <div
      style={{
        position:'relative',
        paddingRight:26
      }}
    >
      <div
        style={{
          fontSize:'0.74rem',
          fontWeight:700,
          marginBottom:4,
          textAlign:'center'
        }}
      >
        Game #{gameNumber}
      </div>

      <TeamLine
        name={a}
        score={aScore}
        color={aColor}
      />

      <TeamLine
        name={b}
        score={bScore}
        color={bColor}
      />

      <div
        style={{
          position:'absolute',
          right:0,
          top:28,
          width:26,
          height:38,
          borderRight:'2px solid #555',
          borderTop:'2px solid #555',
          borderBottom:'2px solid #555'
        }}
      />

      {match?.status==='needs_tiebreaker' && (
        <div
          style={{
            marginTop:5,
            textAlign:'center',
            fontSize:'0.72rem',
            fontWeight:800
          }}
        >
          O/U Tiebreaker Required
        </div>
      )}
    </div>
  )
}

function TeamLine({
  name,
  score,
  color
}:{
  name:string
  score:number|null
  color?:string
}){
  return (
    <div
      style={{
        minHeight:34,
        display:'grid',
        gridTemplateColumns:'1fr 56px',
        alignItems:'end',
        gap:6,
        borderBottom:
          `2px solid ${color || '#555'}`,
        color:color,
        fontWeight:
          color
            ? 800
            : 500,
        padding:'0 4px 3px'
      }}
    >
      <div>
        {name}
      </div>

      <div
        style={{
          textAlign:'right',
          fontWeight:800
        }}
      >
        {signedScore(score)}
      </div>
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
        color={
          match?.status==='final'
            ? 'green'
            : undefined
        }
        champion={
          championLabel &&
          winnerPlace===1
        }
      />

      <FinishLine
        name={loserName}
        place={loserPlace}
        payout={payouts[loserPlace]}
        color={
          match?.status==='final'
            ? 'red'
            : undefined
        }
      />
    </div>
  )
}

function FinishLine({
  name,
  place,
  payout,
  color,
  champion=false
}:{
  name:string
  place:number
  payout:number
  color?:string
  champion?:boolean
}){
  return (
    <div>
      <div
        style={{
          borderBottom:
            `2px solid ${color || '#555'}`,
          padding:'0 4px 4px',
          textAlign:'center',
          color:color,
          fontWeight:
            champion
              ? 900
              : 700
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