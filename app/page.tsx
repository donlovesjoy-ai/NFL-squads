import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const [{data:activeGames,error:activeError},{data:squad,error:squadError}]=await Promise.all([
    supabase.from('games')
      .select('nfl_week')
      .eq('season_year',2026)
      .neq('status','final')
      .order('nfl_week',{ascending:true})
      .limit(1),
    supabase.from('squads')
      .select('id,nfl_team_id')
      .eq('season_year',2026)
      .eq('user_id',user.id)
      .maybeSingle()
  ])

  const week=Number(activeGames?.[0]?.nfl_week)
  if(activeError || squadError || !squad || !Number.isInteger(week) || week<=1){
    redirect('/dashboard?home=1')
  }

  const [{data:previousGames,error:previousError},{data:game,error:gameError},{data:weekStatuses,error:weekError}]=await Promise.all([
    supabase.from('games')
      .select('status')
      .eq('season_year',2026)
      .eq('nfl_week',week-1),
    supabase.from('games')
      .select('id,status,scheduled_kickoff_time,kickoff_time')
      .eq('season_year',2026)
      .eq('nfl_week',week)
      .or(`home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`)
      .maybeSingle(),
    supabase.rpc('get_pick_week_open_statuses',{
      p_season:2026,
      p_squad_id:squad.id
    })
  ])

  const previousWeekFinished=
    !previousError &&
    Boolean(previousGames?.length) &&
    previousGames!.every(row=>String(row.status).toLowerCase()==='final')
  const open= !weekError && weekStatuses?.some(
    (row:any)=>Number(row.nfl_week)===week && row.is_open===true
  )
  const kickoff=game?.scheduled_kickoff_time || game?.kickoff_time
  const gameAvailable=
    !gameError &&
    Boolean(game) &&
    String(game?.status).toLowerCase()==='scheduled' &&
    Boolean(kickoff) &&
    new Date(kickoff).getTime()>Date.now()

  if(previousWeekFinished && open && gameAvailable){
    const {data:pick,error:pickError}=await supabase.from('picks')
      .select('selection_team_id,is_missed')
      .eq('squad_id',squad.id)
      .eq('game_id',game!.id)
      .maybeSingle()

    if(!pickError && (!pick || pick.is_missed || pick.selection_team_id==null)){
      redirect('/my-pick')
    }
  }

  redirect('/dashboard?home=1')
}
