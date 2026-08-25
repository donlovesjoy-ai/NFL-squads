 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'

const championshipPayouts:Record<number,number>={
  1:250, 2:200, 3:175, 4:150,
  5:125, 6:100, 7:75, 8:50
}

const consolationPayouts:Record<number,number>={
  9:-50, 10:-75, 11:-100, 12:-125,
  13:-150, 14:-175, 15:-200, 16:-250
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
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

function signedScore(n:any){
  if(n===null || n===undefined){
    return ''
  }

  const x=Number(n)

  return x>0
    ? `+${x}`
    : `${x}`
}

function participant(
  source:any,
  outcome:'winner'|'loser',
  fallback:string
){
  if(!source){
    return {
      id:null,
      name:fallback
    }
  }

  const id=
    outcome==='winner'
      ? source.winner_squad_id
      : source.loser_squad_id

  const name=
    outcome==='winner'
      ? source.winner?.squad_name
      : source.loser?.squad_name

  return {
    id:id || null,
    name:name || fallback
  }
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

  for(const p of (playoffPicks||[]) as any[]){
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
      ) ?? null
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
          textAlign:'center',
          paddingTop:22,
          paddingBottom:22
        }}
      >
        <div
          style={{
            fontSize:'0.72rem',
            fontWeight:900,
            letterSpacing:'0.14em',
            textTransform:'uppercase',
            opacity:0.6,
            marginBottom:6
          }}
        >
          Postseason
        </div>

        <h1
          style={{
            margin:'0 0 10px'
          }}
        >
          Playoff Matrix
        </h1>

        <p
          className="muted"
          style={{
            maxWidth:620,
            margin:'0 auto',
            lineHeight:1.5
          }}
        >
          Weekly ATS margin is the playoff score.
          Highest score advances. Exact division
          positions populate when each seed is
          mathematically locked.
        </p>
      </section>

      <BracketMatrix
        title="Championship Playoff Matrix"
        subtitle="Places 1–8"
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

      <BracketMatrix
        title="Consolation Playoff Matrix"
        subtitle="Places 9–16"
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
            Final Results
          </div>

          <h2
            style={{
              marginTop:0
            }}
          >
            Placements & Payouts
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
                      <td
                        style={{
                          textAlign:'center',
                          fontWeight:800
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
                          textAlign:'center',
                          fontWeight:700
                        }}
                      >
                        {p.squads?.squad_name}
                      </td>

                      <td
                        style={{
                          textAlign:'center',
                          fontWeight:800
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

function BracketMatrix({
  title,
  subtitle,
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
  subtitle:string
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

  const row5=getMatch(17,upperBand,1)
  const row6=getMatch(17,upperBand,2)

  const row7=getMatch(17,lowerBand,1)
  const row8=getMatch(17,lowerBand,2)

  const row9=getMatch(18,upperBand,1)
  const row10=getMatch(18,upperBand,2)

  const row11=getMatch(18,lowerBand,1)
  const row12=getMatch(18,lowerBand,2)

  const g5a=participant(
    g1,
    'winner',
    'Game #1 Winner'
  )

  const g5b=participant(
    g2,
    'winner',
    'Game #2 Winner'
  )

  const g6a=participant(
    g3,
    'winner',
    'Game #3 Winner'
  )

  const g6b=participant(
    g4,
    'winner',
    'Game #4 Winner'
  )

  const g7a=participant(
    g1,
    'loser',
    'Game #1 Loser'
  )

  const g7b=participant(
    g2,
    'loser',
    'Game #2 Loser'
  )

  const g8a=participant(
    g3,
    'loser',
    'Game #3 Loser'
  )

  const g8b=participant(
    g4,
    'loser',
    'Game #4 Loser'
  )

  const g5=derivedMatch(
    row5,
    g5a,
    g5b
  )

  const g6=derivedMatch(
    row6,
    g6a,
    g6b
  )

  const g7=derivedMatch(
    row7,
    g7a,
    g7b
  )

  const g8=derivedMatch(
    row8,
    g8a,
    g8b
  )

  const g9a=participant(
    g5,
    'winner',
    'Game #5 Winner'
  )

  const g9b=participant(
    g6,
    'winner',
    'Game #6 Winner'
  )

  const g10a=participant(
    g5,
    'loser',
    'Game #5 Loser'
  )

  const g10b=participant(
    g6,
    'loser',
    'Game #6 Loser'
  )

  const g11a=participant(
    g7,
    'winner',
    'Game #7 Winner'
  )

  const g11b=participant(
    g8,
    'winner',
    'Game #8 Winner'
  )

  const g12a=participant(
    g7,
    'loser',
    'Game #7 Loser'
  )

  const g12b=participant(
    g8,
    'loser',
    'Game #8 Loser'
  )

  const g9=derivedMatch(
    row9,
    g9a,
    g9b
  )

  const g10=derivedMatch(
    row10,
    g10a,
    g10b
  )

  const g11=derivedMatch(
    row11,
    g11a,
    g11b
  )

  const g12=derivedMatch(
    row12,
    g12a,
    g12b
  )

  const WIDTH=1260
  const HEIGHT=1110

  const x16=18
  const x17=350
  const x18=700
  const xFinal=1035

  const gameWidth=270
  const finalWidth=205

  const y1=75
  const y2=245
  const y3=435
  const y4=605

  const y5=160
  const y6=520

  const y7=750
  const y8=920

  const y9=340
  const y10=610

  const y11=835
  const y12=1005

  return (
    <section
      className="card"
      style={{
        paddingLeft:0,
        paddingRight:0,
        overflow:'hidden'
      }}
    >
      <div
        style={{
          textAlign:'center',
          padding:'4px 18px 16px'
        }}
      >
        <div
          style={{
            fontSize:'0.7rem',
            fontWeight:900,
            letterSpacing:'0.12em',
            textTransform:'uppercase',
            opacity:0.55,
            marginBottom:4
          }}
        >
          {subtitle}
        </div>

        <h2
          style={{
            margin:'0 0 6px'
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
          Follow the bracket to the right
          <span
            aria-hidden="true"
            style={{
              marginLeft:7,
              fontWeight:900,
              letterSpacing:2
            }}
          >
            ››
          </span>
        </div>
      </div>

      <div
        style={{
          overflowX:'auto',
          WebkitOverflowScrolling:'touch',
          padding:'0 10px 14px',
          scrollbarWidth:'thin'
        }}
      >
        <div
          style={{
            position:'relative',
            width:WIDTH,
            height:HEIGHT
          }}
        >

          <RoundHeader
            left={x16}
            width={gameWidth}
            label="Week 16"
            detail="Opening Round"
            showArrow
          />

          <RoundHeader
            left={x17}
            width={gameWidth}
            label="Week 17"
            detail="Second Round"
            showArrow
          />

          <RoundHeader
            left={x18}
            width={gameWidth}
            label="Week 18"
            detail="Placement Round"
            showArrow
          />

          <RoundHeader
            left={xFinal}
            width={finalWidth}
            label="Final Place"
            detail="Payout"
          />

          <svg
            width={WIDTH}
            height={HEIGHT}
            style={{
              position:'absolute',
              inset:0,
              pointerEvents:'none',
              overflow:'visible'
            }}
          >

            <PathConnector
              startX={x16+gameWidth}
              startY={y1+58}
              bendX={319}
              endX={x17}
              endY={y5+50}
            />

            <PathConnector
              startX={x16+gameWidth}
              startY={y2+58}
              bendX={319}
              endX={x17}
              endY={y5+88}
            />

            <PathConnector
              startX={x16+gameWidth}
              startY={y3+58}
              bendX={319}
              endX={x17}
              endY={y6+50}
            />

            <PathConnector
              startX={x16+gameWidth}
              startY={y4+58}
              bendX={319}
              endX={x17}
              endY={y6+88}
            />

            <PathConnector
              startX={x16+gameWidth}
              startY={y1+96}
              bendX={306}
              endX={x17}
              endY={y7+50}
            />

            <PathConnector
              startX={x16+gameWidth}
              startY={y2+96}
              bendX={306}
              endX={x17}
              endY={y7+88}
            />

            <PathConnector
              startX={x16+gameWidth}
              startY={y3+96}
              bendX={306}
              endX={x17}
              endY={y8+50}
            />

            <PathConnector
              startX={x16+gameWidth}
              startY={y4+96}
              bendX={306}
              endX={x17}
              endY={y8+88}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y5+58}
              bendX={670}
              endX={x18}
              endY={y9+50}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y6+58}
              bendX={670}
              endX={x18}
              endY={y9+88}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y5+96}
              bendX={656}
              endX={x18}
              endY={y10+50}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y6+96}
              bendX={656}
              endX={x18}
              endY={y10+88}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y7+58}
              bendX={670}
              endX={x18}
              endY={y11+50}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y8+58}
              bendX={670}
              endX={x18}
              endY={y11+88}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y7+96}
              bendX={656}
              endX={x18}
              endY={y12+50}
            />

            <PathConnector
              startX={x17+gameWidth}
              startY={y8+96}
              bendX={656}
              endX={x18}
              endY={y12+88}
            />

            <StraightConnector
              startX={x18+gameWidth}
              startY={y9+69}
              endX={xFinal}
              endY={y9+69}
            />

            <StraightConnector
              startX={x18+gameWidth}
              startY={y10+69}
              endX={xFinal}
              endY={y10+69}
            />

            <StraightConnector
              startX={x18+gameWidth}
              startY={y11+69}
              endX={xFinal}
              endY={y11+69}
            />

            <StraightConnector
              startX={x18+gameWidth}
              startY={y12+69}
              endX={xFinal}
              endY={y12+69}
            />

          </svg>

          <GameNode
            left={x16}
            top={y1}
            width={gameWidth}
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

          <GameNode
            left={x16}
            top={y2}
            width={gameWidth}
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

          <GameNode
            left={x16}
            top={y3}
            width={gameWidth}
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

          <GameNode
            left={x16}
            top={y4}
            width={gameWidth}
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

          <GameNode
            left={x17}
            top={y5}
            width={gameWidth}
            gameNumber={5}
            week={17}
            a={g5a.name}
            b={g5b.name}
            aId={g5a.id}
            bId={g5b.id}
            match={g5}
            getScore={getScore}
          />

          <GameNode
            left={x17}
            top={y6}
            width={gameWidth}
            gameNumber={6}
            week={17}
            a={g6a.name}
            b={g6b.name}
            aId={g6a.id}
            bId={g6b.id}
            match={g6}
            getScore={getScore}
          />

          <GameNode
            left={x17}
            top={y7}
            width={gameWidth}
            gameNumber={7}
            week={17}
            a={g7a.name}
            b={g7b.name}
            aId={g7a.id}
            bId={g7b.id}
            match={g7}
            getScore={getScore}
          />

          <GameNode
            left={x17}
            top={y8}
            width={gameWidth}
            gameNumber={8}
            week={17}
            a={g8a.name}
            b={g8b.name}
            aId={g8a.id}
            bId={g8b.id}
            match={g8}
            getScore={getScore}
          />

          <GameNode
            left={x18}
            top={y9}
            width={gameWidth}
            gameNumber={9}
            week={18}
            a={g9a.name}
            b={g9b.name}
            aId={g9a.id}
            bId={g9b.id}
            match={g9}
            getScore={getScore}
          />

          <GameNode
            left={x18}
            top={y10}
            width={gameWidth}
            gameNumber={10}
            week={18}
            a={g10a.name}
            b={g10b.name}
            aId={g10a.id}
            bId={g10b.id}
            match={g10}
            getScore={getScore}
          />

          <GameNode
            left={x18}
            top={y11}
            width={gameWidth}
            gameNumber={11}
            week={18}
            a={g11a.name}
            b={g11b.name}
            aId={g11a.id}
            bId={g11b.id}
            match={g11}
            getScore={getScore}
          />

          <GameNode
            left={x18}
            top={y12}
            width={gameWidth}
            gameNumber={12}
            week={18}
            a={g12a.name}
            b={g12b.name}
            aId={g12a.id}
            bId={g12b.id}
            match={g12}
            getScore={getScore}
          />

          <FinalNode
            left={xFinal}
            top={y9-10}
            width={finalWidth}
            match={g9}
            winnerPlace={firstPlace}
            loserPlace={firstPlace+1}
            payouts={payouts}
            championLabel={championLabel}
          />

          <FinalNode
            left={xFinal}
            top={y10-10}
            width={finalWidth}
            match={g10}
            winnerPlace={firstPlace+2}
            loserPlace={firstPlace+3}
            payouts={payouts}
          />

          <FinalNode
            left={xFinal}
            top={y11-10}
            width={finalWidth}
            match={g11}
            winnerPlace={firstPlace+4}
            loserPlace={firstPlace+5}
            payouts={payouts}
          />

          <FinalNode
            left={xFinal}
            top={y12-10}
            width={finalWidth}
            match={g12}
            winnerPlace={firstPlace+6}
            loserPlace={firstPlace+7}
            payouts={payouts}
          />

        </div>
      </div>
    </section>
  )
}

function derivedMatch(
  row:any,
  a:{
    id:number|null
    name:string
  },
  b:{
    id:number|null
    name:string
  }
){
  if(!row){
    return {
      squad_a_id:a.id,
      squad_b_id:b.id,

      squad_a:{
        squad_name:a.name
      },

      squad_b:{
        squad_name:b.name
      },

      winner_squad_id:null,
      loser_squad_id:null,
      winner:null,
      loser:null,
      status:'waiting'
    }
  }

  return {
    ...row,

    squad_a_id:a.id,
    squad_b_id:b.id,

    squad_a:{
      id:a.id,
      squad_name:a.name
    },

    squad_b:{
      id:b.id,
      squad_name:b.name
    }
  }
}

function RoundHeader({
  left,
  width,
  label,
  detail,
  showArrow=false
}:{
  left:number
  width:number
  label:string
  detail:string
  showArrow?:boolean
}){
  return (
    <div
      style={{
        position:'absolute',
        left,
        top:4,
        width,
        textAlign:'center'
      }}
    >
      <div
        style={{
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          gap:8
        }}
      >
        <span
          style={{
            fontWeight:900,
            fontSize:'0.92rem'
          }}
        >
          {label}
        </span>

        {showArrow && (
          <span
            aria-hidden="true"
            style={{
              fontWeight:900,
              opacity:0.42,
              letterSpacing:1
            }}
          >
            ››
          </span>
        )}
      </div>

      <div
        style={{
          marginTop:2,
          fontSize:'0.68rem',
          fontWeight:700,
          opacity:0.5,
          textTransform:'uppercase',
          letterSpacing:'0.08em'
        }}
      >
        {detail}
      </div>
    </div>
  )
}

function GameNode({
  left,
  top,
  width,
  gameNumber,
  week,
  a,
  b,
  aId,
  bId,
  match,
  getScore
}:{
  left:number
  top:number
  width:number
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
      match?.winner_squad_id || 0
    )

  const loserId=
    Number(
      match?.loser_squad_id || 0
    )

  const colorFor=(
    squadId:number|null|undefined
  )=>{
    if(match?.status!=='final'){
      return undefined
    }

    if(
      Number(squadId)===winnerId
    ){
      return '#16803c'
    }

    if(
      Number(squadId)===loserId
    ){
      return '#b42318'
    }

    return undefined
  }

  return (
    <div
      style={{
        position:'absolute',
        left,
        top,
        width,
        border:'1px solid rgba(120,120,120,0.28)',
        borderRadius:10,
        background:'var(--card, rgba(255,255,255,0.03))',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        overflow:'hidden'
      }}
    >
      <div
        style={{
          textAlign:'center',
          fontSize:'0.67rem',
          fontWeight:900,
          letterSpacing:'0.08em',
          textTransform:'uppercase',
          padding:'7px 8px 5px',
          borderBottom:'1px solid rgba(120,120,120,0.18)',
          opacity:0.65
        }}
      >
        Game #{gameNumber}
      </div>

      <ParticipantLine
        name={a}
        score={aScore}
        color={colorFor(aId)}
      />

      <ParticipantLine
        name={b}
        score={bScore}
        color={colorFor(bId)}
      />

      {match?.status==='needs_tiebreaker' && (
        <div
          style={{
            textAlign:'center',
            fontSize:'0.68rem',
            fontWeight:900,
            padding:'6px 8px',
            borderTop:'1px solid rgba(120,120,120,0.18)'
          }}
        >
          O/U Tiebreaker Required
        </div>
      )}
    </div>
  )
}

function ParticipantLine({
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
        minHeight:38,
        display:'grid',
        gridTemplateColumns:'minmax(0,1fr) 50px',
        alignItems:'center',
        gap:8,
        borderBottom:'1px solid rgba(120,120,120,0.18)',
        color,
        padding:'4px 10px',
        fontWeight:
          color
            ? 900
            : 650
      }}
    >
      <div
        style={{
          minWidth:0,
          whiteSpace:'nowrap',
          overflow:'hidden',
          textOverflow:'ellipsis',
          fontSize:'0.82rem'
        }}
        title={name}
      >
        {name}
      </div>

      <div
        style={{
          textAlign:'right',
          fontWeight:900,
          fontVariantNumeric:'tabular-nums',
          minHeight:'1em'
        }}
      >
        {signedScore(score)}
      </div>
    </div>
  )
}

function FinalNode({
  left,
  top,
  width,
  match,
  winnerPlace,
  loserPlace,
  payouts,
  championLabel=false
}:{
  left:number
  top:number
  width:number
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
        position:'absolute',
        left,
        top,
        width
      }}
    >
      <PlacementLine
        name={winnerName}
        place={winnerPlace}
        payout={
          payouts[winnerPlace]
        }
        color={
          match?.status==='final'
            ? '#16803c'
            : undefined
        }
        featured={
          championLabel &&
          winnerPlace===1
        }
      />

      <div
        style={{
          height:12
        }}
      />

      <PlacementLine
        name={loserName}
        place={loserPlace}
        payout={
          payouts[loserPlace]
        }
        color={
          match?.status==='final'
            ? '#b42318'
            : undefined
        }
      />
    </div>
  )
}

function PlacementLine({
  name,
  place,
  payout,
  color,
  featured=false
}:{
  name:string
  place:number
  payout:number
  color?:string
  featured?:boolean
}){
  return (
    <div
      style={{
        border:'1px solid rgba(120,120,120,0.28)',
        borderRadius:9,
        overflow:'hidden',
        background:'var(--card, rgba(255,255,255,0.03))',
        boxShadow:
          featured
            ? '0 3px 12px rgba(0,0,0,0.09)'
            : '0 2px 6px rgba(0,0,0,0.05)'
      }}
    >
      <div
        style={{
          color,
          textAlign:'center',
          fontWeight:900,
          padding:'8px 7px 5px',
          fontSize:
            featured
              ? '0.84rem'
              : '0.8rem',
          whiteSpace:'nowrap',
          overflow:'hidden',
          textOverflow:'ellipsis'
        }}
        title={name}
      >
        {name}
      </div>

      <div
        style={{
          textAlign:'center',
          fontSize:'0.7rem',
          padding:'0 6px 7px',
          opacity:0.72
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

function PathConnector({
  startX,
  startY,
  bendX,
  endX,
  endY
}:{
  startX:number
  startY:number
  bendX:number
  endX:number
  endY:number
}){
  return (
    <polyline
      points={`
        ${startX},${startY}
        ${bendX},${startY}
        ${bendX},${endY}
        ${endX},${endY}
      `}
      fill="none"
      stroke="rgba(110,110,110,0.48)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  )
}

function StraightConnector({
  startX,
  startY,
  endX,
  endY
}:{
  startX:number
  startY:number
  endX:number
  endY:number
}){
  return (
    <line
      x1={startX}
      y1={startY}
      x2={endX}
      y2={endY}
      stroke="rgba(110,110,110,0.48)"
      strokeWidth="1.5"
    />
  )
}