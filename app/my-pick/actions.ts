'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function submitPick(formData:FormData){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const squadId=Number(formData.get('squad_id'))
  const gameId=Number(formData.get('game_id'))
  const selectionTeamId=Number(formData.get('selection_team_id'))

  const {data:squad}=await supabase.from('squads').select('id,user_id').eq('id',squadId).eq('user_id',user.id).maybeSingle()
  if(!squad) redirect('/my-pick?error=not_yours')

  const {data:game}=await supabase.from('games').select('id,home_team_id,away_team_id,kickoff_time').eq('id',gameId).maybeSingle()
  if(!game) redirect('/my-pick?error=no_game')
  if(![game.home_team_id,game.away_team_id].includes(selectionTeamId)) redirect('/my-pick?error=bad_pick')

  const deadline=new Date(new Date(game.kickoff_time).getTime()-60_000)
  if(new Date()>=deadline) redirect('/my-pick?error=locked')

  const {error}=await supabase.from('picks').upsert({
    squad_id:squadId,
    game_id:gameId,
    selection_team_id:selectionTeamId,
    is_locked:false,
    revealed:false
  },{onConflict:'squad_id,game_id'})

  if(error) redirect('/my-pick?error=save')
  redirect('/my-pick?saved=1')
}
