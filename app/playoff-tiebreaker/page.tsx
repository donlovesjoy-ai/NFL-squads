 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'
import { submitTotal } from './actions'

export default async function Tiebreaker({
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
        nfl_team_id,
        squad_name,
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
    redirect('/dashboard')
  }

  const {data:matches}=
    await supabase
      .from('playoff_matchups')
      .select(`
        id,
        nfl_week,
        status,
        squad_a_id,
        squad_b_id
      `)
      .eq('season_year',2026)
      .eq(
        'status',
        'needs_tiebreaker'
      )
      .or(
        `squad_a_id.eq.${squad.id},squad_b_id.eq.${squad.id}`
      )
      .limit(1)

  const m:any=
    matches?.[0]

  if(!m){
    return (
      <main className="wrap">
        <Nav commissioner={commissioner}/>

        <h1>
          Playoff Tiebreaker
        </h1>

        <div className="card">
          No over/under tiebreaker is currently required.
        </div>
      </main>
    )
  }

  const opponentSquadId=
    Number(m.squad_a_id)===
    Number(squad.id)
      ? m.squad_b_id
      : m.squad_a_id

  const {data:opponentSquad}=
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
      .eq('id',opponentSquadId)
      .maybeSingle()

  const {data:gameRows}=
    await supabase
      .from('games')
      .select(`
        id,
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
      .eq('nfl_week',m.nfl_week)
      .or(
        `home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`
      )
      .limit(1)

  const game:any=
    gameRows?.[0]

  const awaySquad=
    Number(
      game?.away_team_id
    )===
    Number(
      squad.nfl_team_id
    )
      ? squad
      : opponentSquad

  const homeSquad=
    Number(
      game?.home_team_id
    )===
    Number(
      squad.nfl_team_id
    )
      ? squad
      : opponentSquad

  return (
    <main className="wrap">
      <Nav commissioner={commissioner}/>

      <h1
        style={{
          textAlign:'center'
        }}
      >
        Playoff Tiebreaker
      </h1>

      <div
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h2>
          Week {m.nfl_week}
        </h2>

        <div
          style={{
            display:'flex',
            justifyContent:'center',
            alignItems:'center',
            gap:18,
            margin:'14px 0'
          }}
        >
          <div>
            <div
              style={{
                display:'flex',
                justifyContent:'center'
              }}
            >
              <SquadLogo
                logoPath={
                  awaySquad?.logo_path
                }
                nflAbbreviation={
                  game?.away
                    ?.abbreviation
                }
                squadName={
                  awaySquad
                    ?.squad_name ||
                  game?.away?.name
                }
                size={64}
              />
            </div>

            <b>
              {awaySquad
                ?.squad_name ||
                game?.away?.name}
            </b>
          </div>

          <b>
            at
          </b>

          <div>
            <div
              style={{
                display:'flex',
                justifyContent:'center'
              }}
            >
              <SquadLogo
                logoPath={
                  homeSquad?.logo_path
                }
                nflAbbreviation={
                  game?.home
                    ?.abbreviation
                }
                squadName={
                  homeSquad
                    ?.squad_name ||
                  game?.home?.name
                }
                size={64}
              />
            </div>

            <b>
              {homeSquad
                ?.squad_name ||
                game?.home?.name}
            </b>
          </div>
        </div>

        <p className="muted">
          Because both playoff opponents own NFL teams
          playing each other, submit the game total and
          Over/Under selection.
        </p>

        {sp.saved && (
          <p className="status">
            Tiebreaker saved.
          </p>
        )}

        {sp.error && (
          <p className="status">
            Unable to save tiebreaker.
          </p>
        )}

        <form action={submitTotal}>
          <input
            type="hidden"
            name="matchup_id"
            value={m.id}
          />

          <input
            type="hidden"
            name="squad_id"
            value={squad.id}
          />

          <input
            type="hidden"
            name="game_id"
            value={game?.id}
          />

          <label>
            Official game total
          </label>

          <input
            name="game_total"
            type="number"
            step="0.5"
            required
          />

          <label>
            Selection
          </label>

          <select
            name="choice"
            required
          >
            <option value="over">
              Over
            </option>

            <option value="under">
              Under
            </option>
          </select>

          <button
            className="submit"
            type="submit"
          >
            Submit Tiebreaker
          </button>
        </form>
      </div>
    </main>
  )
}