 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'
import { submitPick } from './actions'

function fmtSpread(
  n:number|null
){
  if(n===null){
    return 'Line not posted'
  }

  if(n===0){
    return 'PK'
  }

  return n>0
    ? `+${n}`
    : `${n}`
}

function fmtEastern(
  value:string|Date
){
  return new Date(
    value
  ).toLocaleString(
    'en-US',
    {
      timeZone:'America/New_York',
      month:'short',
      day:'numeric',
      hour:'numeric',
      minute:'2-digit',
      timeZoneName:'short'
    }
  )
}

function gameStatusLabel(
  status:any
){
  const normalized=
    String(
      status||''
    ).toLowerCase()

  if(normalized==='final'){
    return 'Final'
  }

  if(normalized==='live'){
    return 'Live'
  }

  return 'Scheduled'
}

export default async function MyPick({
  searchParams
}:{
  searchParams:Promise<{
    saved?:string
    error?:string
  }>
}){
  const sp=
    await searchParams

  const supabase=
    await createClient()

  const {data:{user}}=
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

  const commissioner=
    profile?.role==='commissioner'

  const {data:squad}=
    await supabase
      .from('squads')
      .select(`
        id,
        squad_name,
        nfl_team_id,
        logo_path,
        nfl_teams(
          name,
          abbreviation
        )
      `)
      .eq('user_id',user.id)
      .eq('season_year',2026)
      .maybeSingle()

  if(!squad){
    return (
      <main className="wrap">
        <Nav commissioner={commissioner}/>

        <h1 style={{textAlign:'center'}}>
          My Pick
        </h1>

        <div
          className="card"
          style={{
            textAlign:'center',
            maxWidth:720,
            margin:'0 auto'
          }}
        >
          Your squad has not been assigned yet.
        </div>
      </main>
    )
  }

  const {data:leagueSquads}=
    await supabase
      .from('squads')
      .select(`
        id,
        squad_name,
        nfl_team_id,
        logo_path,
        nfl_teams(
          name,
          abbreviation
        )
      `)
      .eq('season_year',2026)

  const squadByNflTeam=
    new Map<number,any>()

  for(const s of leagueSquads||[]){
    squadByNflTeam.set(
      Number(s.nfl_team_id),
      s
    )
  }

  const {data:allGames}=
    await supabase
      .from('games')
      .select(`
        id,
        nfl_week,
        kickoff_time,
        spread,
        status,
        final_at,
        home_team_id,
        away_team_id,

        home:
          nfl_teams!games_home_team_id_fkey(
            name,
            abbreviation
          ),

        away:
          nfl_teams!games_away_team_id_fkey(
            name,
            abbreviation
          )
      `)
      .eq('season_year',2026)
      .or(
        `home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`
      )
      .order('nfl_week',{ascending:true})
      .order('kickoff_time',{ascending:true})

  const squadGames=
    (allGames||[]) as any[]

  const weeks=[
    ...new Set(
      squadGames.map(
        (g:any)=>
          Number(g.nfl_week)
      )
    )
  ]

  const weekChecks=
    await Promise.all(
      weeks.map(
        async week=>{
          const {data:open}=
            await supabase.rpc(
              'is_pick_week_open',
              {
                p_season:2026,
                p_week:week,
                p_squad_id:squad.id
              }
            )

          return {
            week,
            open:open===true
          }
        }
      )
    )

  const openWeeks=
    weekChecks
      .filter(w=>w.open)
      .map(w=>w.week)
      .sort((a,b)=>b-a)

  let selectedWeek:
    number|null=null

  for(const week of openWeeks){
    const hasAvailableGame=
      squadGames.some(
        (g:any)=>
          Number(g.nfl_week)===week &&
          String(
            g.status||''
          ).toLowerCase()!=='final'
      )

    if(hasAvailableGame){
      selectedWeek=week
      break
    }
  }

  const game:any=
    selectedWeek===null
      ? null
      : squadGames.find(
          (g:any)=>
            Number(g.nfl_week)===selectedWeek &&
            String(
              g.status||''
            ).toLowerCase()!=='final'
        )

  if(!game){
    const nextGame=
      squadGames.find(
        (g:any)=>
          String(
            g.status||''
          ).toLowerCase()!=='final'
      )

    if(!nextGame){
      return (
        <main className="wrap">
          <Nav commissioner={commissioner}/>

          <h1 style={{textAlign:'center'}}>
            My Pick
          </h1>

          <div
            className="card"
            style={{
              textAlign:'center',
              maxWidth:720,
              margin:'0 auto'
            }}
          >
            No remaining matchup found.
          </div>
        </main>
      )
    }

    const nextWeek=
      Number(nextGame.nfl_week)

    const previousWeek=
      nextWeek-1

    const previousGame=
      squadGames.find(
        (g:any)=>
          Number(g.nfl_week)===previousWeek
      )

    const previousWeekWasBye=
      previousWeek>=1 &&
      !previousGame

    return (
      <main className="wrap">
        <Nav commissioner={commissioner}/>

        <h1 style={{textAlign:'center'}}>
          My Pick
        </h1>

        <section
          className="card"
          style={{
            textAlign:'center',
            maxWidth:720,
            margin:'0 auto'
          }}
        >
          <h2>
            Week {nextWeek}
          </h2>

          {previousWeekWasBye ? (
            <>
              <p style={{fontWeight:700}}>
                Pick selection for Week {nextWeek} opens
                7 days before kickoff following your
                Week {previousWeek} bye.
              </p>

              <p className="muted">
                Week {nextWeek} kickoff:{' '}
                {fmtEastern(
                  nextGame.kickoff_time
                )}
              </p>
            </>
          ) : (
            <>
              <p style={{fontWeight:700}}>
                Pick selection for Week {nextWeek} opens
                after completion of your Week {previousWeek} game.
              </p>

              <p className="muted">
                Week {previousWeek} game status:{' '}
                <b>
                  {gameStatusLabel(
                    previousGame?.status
                  )}
                </b>
              </p>
            </>
          )}

          <p
            className="muted"
            style={{
              marginTop:18,
              fontSize:'0.82rem'
            }}
          >
            Lines are subject to change.
            Your official pick line will be the
            closing line assigned at kickoff.
          </p>
        </section>
      </main>
    )
  }

  const playoffWeek=
    Number(game.nfl_week)>=16 &&
    Number(game.nfl_week)<=18

  const awaySquad=
    squadByNflTeam.get(
      Number(game.away_team_id)
    )

  const homeSquad=
    squadByNflTeam.get(
      Number(game.home_team_id)
    )

  const awayName=
    awaySquad?.squad_name ||
    game.away?.name

  const homeName=
    homeSquad?.squad_name ||
    game.home?.name

  const [
    {data:pick},
    {data:weekOpen}
  ]=
    await Promise.all([
      supabase
        .from('picks')
        .select(`
          selection_team_id,
          result,
          ats_margin,
          is_locked,
          revealed,
          is_missed,
          game_total_prediction
        `)
        .eq('squad_id',squad.id)
        .eq('game_id',game.id)
        .maybeSingle(),

      supabase.rpc(
        'is_pick_week_open',
        {
          p_season:2026,
          p_week:game.nfl_week,
          p_squad_id:squad.id
        }
      )
    ])

  const deadline=
    new Date(
      new Date(
        game.kickoff_time
      ).getTime()-60_000
    )

  const deadlinePassed=
    new Date()>=deadline

  const gameStatus=
    String(
      game.status||''
    ).toLowerCase()

  const gameStarted=
    gameStatus==='live' ||
    gameStatus==='final'

  const locked=
    deadlinePassed ||
    gameStarted ||
    pick?.is_locked===true

  const homeSpread=
    game.spread===null
      ? null
      : Number(game.spread)

  const awaySpread=
    homeSpread===null
      ? null
      : -homeSpread

  const submissionDisabled=
    !weekOpen ||
    locked ||
    homeSpread===null

  let buttonText=
    'Submit / Update Pick'

  if(!weekOpen){
    buttonText=
      'Week Not Open Yet'
  }
  else if(locked){
    buttonText=
      'Pick Locked'
  }
  else if(homeSpread===null){
    buttonText=
      'Waiting for Closing Line'
  }

  return (
    <main className="wrap">
      <Nav commissioner={commissioner}/>

      <h1 style={{textAlign:'center'}}>
        My Pick
      </h1>

      <section
        className="card"
        style={{
          textAlign:'center',
          maxWidth:720,
          margin:'0 auto'
        }}
      >
        <h2>
          NFL Week {game.nfl_week}
        </h2>

        <p>
          {fmtEastern(
            game.kickoff_time
          )}
        </p>

        <p>
          <b>
            Pick deadline:
          </b>
          {' '}
          {fmtEastern(deadline)}
        </p>

        {!weekOpen && (
          <p className="status">
            Week {game.nfl_week} picks are not open yet.
          </p>
        )}

        {gameStarted && (
          <p className="status">
            This game has started. Your pick is locked.
          </p>
        )}

        {!gameStarted &&
         deadlinePassed && (
          <p className="status">
            The pick deadline has passed. Your pick is locked.
          </p>
        )}

        {sp.saved && (
          <p className="status">
            Pick saved.
          </p>
        )}

        {sp.error==='week_closed' && (
          <p className="status">
            This week&apos;s picks are not open yet.
          </p>
        )}

        {sp.error==='locked' && (
          <p className="status">
            This pick is locked and can no longer be changed.
          </p>
        )}

        {sp.error==='game_total_required' && (
          <p className="status">
            A Game Total Prediction is required
            during the playoffs.
          </p>
        )}

        {sp.error==='bad_game_total' && (
          <p className="status">
            Please enter a valid Game Total Prediction.
          </p>
        )}

        {sp.error &&
         sp.error!=='week_closed' &&
         sp.error!=='locked' &&
         sp.error!=='game_total_required' &&
         sp.error!=='bad_game_total' && (
          <p className="status">
            Unable to save pick: {sp.error}
          </p>
        )}

        {pick &&
         !pick.is_missed && (
          <p className="status">
            Current pick submitted.
          </p>
        )}

        {pick?.is_missed && (
          <p className="status">
            No pick was submitted for this matchup.
          </p>
        )}

        <form
          action={submitPick}
          style={{
            display:'grid',
            gap:14,
            maxWidth:520,
            margin:'20px auto 0'
          }}
        >
          <input
            type="hidden"
            name="squad_id"
            value={squad.id}
          />

          <input
            type="hidden"
            name="game_id"
            value={game.id}
          />

          <label
            className="pick"
            style={{
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:8,
              textAlign:'center'
            }}
          >
            <input
              type="radio"
              name="selection_team_id"
              value={game.away_team_id}
              defaultChecked={
                pick?.selection_team_id===
                game.away_team_id
              }
              required
              disabled={
                !weekOpen ||
                locked
              }
            />

            <SquadLogo
              logoPath={
                awaySquad?.logo_path
              }
              nflAbbreviation={
                game.away?.abbreviation
              }
              squadName={awayName}
              size={28}
            />

            <b>
              {awayName}
            </b>

            <span>
              {fmtSpread(
                awaySpread
              )}
            </span>
          </label>

          <label
            className="pick"
            style={{
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:8,
              textAlign:'center'
            }}
          >
            <input
              type="radio"
              name="selection_team_id"
              value={game.home_team_id}
              defaultChecked={
                pick?.selection_team_id===
                game.home_team_id
              }
              required
              disabled={
                !weekOpen ||
                locked
              }
            />

            <SquadLogo
              logoPath={
                homeSquad?.logo_path
              }
              nflAbbreviation={
                game.home?.abbreviation
              }
              squadName={homeName}
              size={28}
            />

            <b>
              {homeName}
            </b>

            <span>
              {fmtSpread(
                homeSpread
              )}
            </span>
          </label>

          {playoffWeek && (
            <div
              style={{
                marginTop:4,
                padding:'14px 12px',
                border:'1px solid #ddd',
                borderRadius:10,
                textAlign:'center'
              }}
            >
              <label
                htmlFor="game_total_prediction"
                style={{
                  display:'block',
                  fontWeight:800,
                  marginBottom:8
                }}
              >
                Game Total Prediction
              </label>

              <input
                id="game_total_prediction"
                name="game_total_prediction"
                type="number"
                min="0"
                step="any"
                required
                disabled={
                  !weekOpen ||
                  locked
                }
                defaultValue={
                  pick?.game_total_prediction
                    ?? ''
                }
                inputMode="decimal"
                style={{
                  width:120,
                  maxWidth:'100%',
                  textAlign:'center',
                  fontSize:'1.05rem',
                  fontWeight:700,
                  padding:'9px 10px'
                }}
              />

              <p
                className="muted"
                style={{
                  fontSize:'0.78rem',
                  lineHeight:1.4,
                  margin:'8px auto 0',
                  maxWidth:400
                }}
              >
                Predict the total combined points
                scored in your NFL game.
                Closest prediction is the first
                playoff tiebreaker.
              </p>
            </div>
          )}

          <p
            className="muted"
            style={{
              fontSize:'0.78rem',
              lineHeight:1.4,
              margin:'2px auto 0',
              maxWidth:440
            }}
          >
            Lines are subject to change.
            Your official pick line will be
            the closing line assigned at kickoff.
          </p>

          <div
            style={{
              textAlign:'center',
              marginTop:6
            }}
          >
            <button
              className="submit"
              type="submit"
              disabled={
                submissionDisabled
              }
            >
              {buttonText}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}