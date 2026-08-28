 'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function errorCode(
  message:string|undefined
){
  const text=
    String(
      message||''
    ).toLowerCase()

  if(text.includes('game_total_required')){
    return 'game_total_required'
  }

  if(text.includes('bad_game_total')){
    return 'bad_game_total'
  }

  if(text.includes('week_closed')){
    return 'week_closed'
  }

  if(text.includes('locked')){
    return 'locked'
  }

  if(text.includes('bad_pick')){
    return 'bad_pick'
  }

  if(text.includes('no_game')){
    return 'no_game'
  }

  if(text.includes('no_squad')){
    return 'not_yours'
  }

  if(text.includes('no_line')){
    return 'save'
  }

  return 'save'
}

export async function submitPick(
  formData:FormData
){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const gameId=
    Number(
      formData.get(
        'game_id'
      )
    )

  const selectionTeamId=
    Number(
      formData.get(
        'selection_team_id'
      )
    )

  const rawGameTotal=
    formData.get(
      'game_total_prediction'
    )

  const gameTotalPrediction=
    rawGameTotal===null ||
    String(
      rawGameTotal
    ).trim()===''
      ? null
      : Number(
          rawGameTotal
        )

  const {
    error
  }=
    await supabase.rpc(
      'submit_my_pick',
      {
        p_game_id:
          gameId,

        p_selection_team_id:
          selectionTeamId,

        p_game_total_prediction:
          gameTotalPrediction,

        p_season:
          2026
      }
    )

  if(error){
    redirect(
      `/my-pick?error=${errorCode(
        error.message
      )}`
    )
  }

  redirect(
    '/my-pick?saved=1'
  )
}