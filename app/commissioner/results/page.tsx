 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'
import { saveGameResult } from './actions'

function kickoffEastern(
  value:string|Date
){
  return new Date(
    value
  ).toLocaleString(
    'en-US',
    {
      timeZone:
        'America/New_York',
      weekday:'short',
      month:'short',
      day:'numeric',
      hour:'numeric',
      minute:'2-digit'
    }
  )
}

export default async function Results({
  searchParams
}:{
  searchParams:Promise<{
    saved?:string
    error?:string
    week?:string
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

  if(
    profile?.role!==
    'commissioner'
  ){
    redirect('/dashboard')
  }

  const week=
    Math.min(
      18,
      Math.max(
        1,
        Number(
          sp.week||1
        )
      )
    )

  const {data:games}=
    await supabase
      .from('games')
      .select(`
        id,
        nfl_week,
        kickoff_time,
        spread,
        home_score,
        away_score,
        status,
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
      .eq(
        'nfl_week',
        week
      )
      .order(
        'kickoff_time'
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
            Commissioner — Lines & Results
          </div>
        </div>
      </div>

      <Nav commissioner/>

      <section className="card">

        <h1>
          Week {week}
        </h1>

        <p className="muted">
          <b>
            Spread convention:
          </b>
          {' '}
          enter the HOME team&apos;s
          closing spread. Example:
          home favorite by 3.5 = -3.5;
          home underdog by 3.5 = +3.5.
        </p>

        <p
          className="muted"
          style={{
            fontSize:'0.8rem'
          }}
        >
          All kickoff times shown in
          Eastern Time (ET).
        </p>

        <div
          style={{
            display:'flex',
            gap:8,
            flexWrap:'wrap'
          }}
        >
          {Array
            .from(
              {length:18},
              (_,i)=>i+1
            )
            .map(
              w=>(
                <a
                  className="status"
                  key={w}
                  href={
                    `/commissioner/results?week=${w}`
                  }
                >
                  W{w}
                </a>
              )
            )}
        </div>

      </section>

      {sp.saved && (
        <p className="status">
          Saved. Any final game was
          graded automatically and
          standings were rebuilt.
        </p>
      )}

      {sp.error && (
        <p className="status">
          Unable to save that game.
        </p>
      )}

      {(games||[]).map(
        (g:any)=>(
          <section
            className="card"
            key={g.id}
          >

            <h3>
              {g.away?.abbreviation}
              {' at '}
              {g.home?.abbreviation}
            </h3>

            <p className="muted">
              {kickoffEastern(
                g.kickoff_time
              )}
              {' ET'}
            </p>

            <form action={saveGameResult}>

              <input
                type="hidden"
                name="game_id"
                value={g.id}
              />

              <label>
                Home closing spread
                {' '}
                ({g.home?.abbreviation})
              </label>

              <input
                name="spread"
                type="number"
                step="0.5"
                defaultValue={
                  g.spread ?? ''
                }
                placeholder="-3.5"
              />

              <div className="grid">

                <div>
                  <label>
                    {g.away?.abbreviation}
                    {' '}
                    final score
                  </label>

                  <input
                    name="away_score"
                    type="number"
                    defaultValue={
                      g.away_score ?? ''
                    }
                  />
                </div>

                <div>
                  <label>
                    {g.home?.abbreviation}
                    {' '}
                    final score
                  </label>

                  <input
                    name="home_score"
                    type="number"
                    defaultValue={
                      g.home_score ?? ''
                    }
                  />
                </div>

              </div>

              <label>
                Status
              </label>

              <select
                name="status"
                defaultValue={
                  g.status ||
                  'scheduled'
                }
              >
                <option value="scheduled">
                  Scheduled
                </option>

                <option value="live">
                  Live
                </option>

                <option value="final">
                  Final — grade picks
                </option>
              </select>

              <button
                className="submit"
                type="submit"
              >
                Save Game
              </button>

            </form>

          </section>
        )
      )}

    </main>
  )
}