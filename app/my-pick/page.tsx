 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
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
      timeZone:
        'America/New_York',
      month:'short',
      day:'numeric',
      hour:'numeric',
      minute:'2-digit',
      timeZoneName:'short'
    }
  )
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
      .eq(
        'id',
        user.id
      )
      .maybeSingle()

  const commissioner=
    profile?.role===
    'commissioner'

  const {data:squad}=
    await supabase
      .from('squads')
      .select(`
        id,
        squad_name,
        nfl_team_id
      `)
      .eq(
        'user_id',
        user.id
      )
      .eq(
        'season_year',
        2026
      )
      .maybeSingle()

  if(!squad){
    return (
      <main className="wrap">

        <Nav
          commissioner={
            commissioner
          }
        />

        <h1
          style={{
            textAlign:'center'
          }}
        >
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
          Your squad has not been
          assigned yet.
        </div>

      </main>
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
      .eq(
        'season_year',
        2026
      )
      .or(
        `home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`
      )
      .order(
        'nfl_week',
        {ascending:true}
      )
      .order(
        'kickoff_time',
        {ascending:true}
      )

  const squadGames=
    (allGames||[]) as any[]

  const weeks=[
    ...new Set(
      squadGames.map(
        (g:any)=>
          Number(
            g.nfl_week
          )
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
                p_week:week
              }
            )

          return {
            week,
            open:
              open===true
          }
        }
      )
    )

  const openWeeks=
    weekChecks
      .filter(
        w=>w.open
      )
      .map(
        w=>w.week
      )
      .sort(
        (a,b)=>b-a
      )

  let selectedWeek:
    number|null=null

  for(
    const week
    of openWeeks
  ){
    const hasAvailableGame=
      squadGames.some(
        (g:any)=>
          Number(
            g.nfl_week
          )===week &&
          String(
            g.status||''
          ).toLowerCase()
            !=='final'
      )

    if(
      hasAvailableGame
    ){
      selectedWeek=
        week

      break
    }
  }

  const game:any=
    selectedWeek===null
      ? null
      : squadGames.find(
          (g:any)=>
            Number(
              g.nfl_week
            )===selectedWeek &&
            String(
              g.status||''
            ).toLowerCase()
              !=='final'
        )

  if(!game){
    return (
      <main className="wrap">

        <Nav
          commissioner={
            commissioner
          }
        />

        <h1
          style={{
            textAlign:'center'
          }}
        >
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
          No currently open
          matchup found.
        </div>

      </main>
    )
  }

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
          is_missed
        `)
        .eq(
          'squad_id',
          squad.id
        )
        .eq(
          'game_id',
          game.id
        )
        .maybeSingle(),

      supabase.rpc(
        'is_pick_week_open',
        {
          p_season:2026,
          p_week:
            game.nfl_week
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
      : Number(
          game.spread
        )

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
  else if(
    homeSpread===null
  ){
    buttonText=
      'Waiting for Closing Line'
  }

  return (
    <main className="wrap">

      <Nav
        commissioner={
          commissioner
        }
      />

      <h1
        style={{
          textAlign:'center'
        }}
      >
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
          Week {game.nfl_week}
        </h2>

        <p>
          <b>
            Kickoff:
          </b>
          {' '}

          {fmtEastern(
            game.kickoff_time
          )}
        </p>

        <p>
          <b>
            Pick deadline:
          </b>
          {' '}

          {fmtEastern(
            deadline
          )}
        </p>

        {!weekOpen && (
          <p className="status">
            Week {game.nfl_week}
            {' '}
            picks are not open yet.
            The new week opens one
            minute after the final
            Monday Night Football
            game from the previous
            week goes final.
          </p>
        )}

        {gameStarted && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            This game has started.
            Your pick is locked.
          </p>
        )}

        {!gameStarted &&
         deadlinePassed && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            The pick deadline has
            passed. Your pick is
            locked.
          </p>
        )}

        {sp.saved && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            Pick saved.
          </p>
        )}

        {sp.error===
          'week_closed' && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            This week&apos;s picks
            are not open yet.
          </p>
        )}

        {sp.error===
          'locked' && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            This pick is locked and
            can no longer be changed.
          </p>
        )}

        {sp.error &&
         sp.error!==
           'week_closed' &&
         sp.error!==
           'locked' && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            Unable to save pick:
            {' '}
            {sp.error}
          </p>
        )}

        {pick &&
         !pick.is_missed && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            Current pick submitted.
          </p>
        )}

        {pick?.is_missed && (
          <p
            className="status"
            style={{
              textAlign:'center'
            }}
          >
            No pick was submitted
            for this matchup.
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
              value={
                game.away_team_id
              }
              defaultChecked={
                pick
                  ?.selection_team_id===
                game.away_team_id
              }
              required
              disabled={
                !weekOpen ||
                locked
              }
            />

            <b>
              {game.away?.name}
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
              value={
                game.home_team_id
              }
              defaultChecked={
                pick
                  ?.selection_team_id===
                game.home_team_id
              }
              required
              disabled={
                !weekOpen ||
                locked
              }
            />

            <b>
              {game.home?.name}
            </b>

            <span>
              {fmtSpread(
                homeSpread
              )}
            </span>
          </label>

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