 'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function submitPick(formData:FormData){
  const supabase=await createClient()

  const {data:{user}}=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const squadId=
    Number(
      formData.get('squad_id')
    )

  const gameId=
    Number(
      formData.get('game_id')
    )

  const selectionTeamId=
    Number(
      formData.get(
        'selection_team_id'
      )
    )

  const {data:squad}=await supabase
    .from('squads')
    .select(`
      id,
      user_id
    `)
    .eq(
      'id',
      squadId
    )
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
    redirect(
      '/my-pick?error=not_yours'
    )
  }

  const {data:game}=await supabase
    .from('games')
    .select(`
      id,
      nfl_week,
      home_team_id,
      away_team_id,
      kickoff_time,
      status
    `)
    .eq(
      'id',
      gameId
    )
    .eq(
      'season_year',
      2026
    )
    .maybeSingle()

  if(!game){
    redirect(
      '/my-pick?error=no_game'
    )
  }

  if(
    ![
      game.home_team_id,
      game.away_team_id
    ].includes(
      selectionTeamId
    )
  ){
    redirect(
      '/my-pick?error=bad_pick'
    )
  }

  const nflWeek=
    Number(
      game.nfl_week
    )

  const playoffWeek=
    nflWeek>=16 &&
    nflWeek<=18

  let gameTotalPrediction:
    number|null=null

  if(playoffWeek){
    const gameTotalRaw=
      formData.get(
        'game_total_prediction'
      )

    if(
      gameTotalRaw===null ||
      String(
        gameTotalRaw
      ).trim()===''
    ){
      redirect(
        '/my-pick?error=game_total_required'
      )
    }

    const parsedGameTotal=
      Number(
        gameTotalRaw
      )

    if(
      !Number.isFinite(
        parsedGameTotal
      ) ||
      parsedGameTotal<0
    ){
      redirect(
        '/my-pick?error=bad_game_total'
      )
    }

    gameTotalPrediction=
      parsedGameTotal
  }

  const gameStatus=
    String(
      game.status||''
    ).toLowerCase()

  if(
    gameStatus==='live' ||
    gameStatus==='final'
  ){
    redirect(
      '/my-pick?error=locked'
    )
  }

  const {
    data:weekOpen,
    error:weekOpenError
  }=await supabase.rpc(
    'is_pick_week_open',
    {
      p_season:2026,
      p_week:game.nfl_week,
      p_squad_id:squadId
    }
  )

  if(
    weekOpenError ||
    !weekOpen
  ){
    redirect(
      '/my-pick?error=week_closed'
    )
  }

  const deadline=
    new Date(
      new Date(
        game.kickoff_time
      ).getTime()-60_000
    )

  if(
    new Date()>=deadline
  ){
    redirect(
      '/my-pick?error=locked'
    )
  }

  const {data:existingPick}=
    await supabase
      .from('picks')
      .select(
        'is_locked'
      )
      .eq(
        'squad_id',
        squadId
      )
      .eq(
        'game_id',
        gameId
      )
      .maybeSingle()

  if(
    existingPick?.is_locked===true
  ){
    redirect(
      '/my-pick?error=locked'
    )
  }

  const {error}=await supabase
    .from('picks')
    .upsert({
      squad_id:squadId,
      game_id:gameId,
      selection_team_id:selectionTeamId,
      game_total_prediction:
        playoffWeek
          ? gameTotalPrediction
          : null,
      is_locked:false,
      revealed:false,
      is_missed:false
    },{
      onConflict:
        'squad_id,game_id'
    })

  if(error){
    redirect(
      '/my-pick?error=save'
    )
  }

  redirect(
    '/my-pick?saved=1'
  )
}