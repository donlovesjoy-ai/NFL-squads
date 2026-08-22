'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function submitTotal(formData:FormData){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const matchupId=Number(formData.get('matchup_id'))
  const squadId=Number(formData.get('squad_id'))
  const gameId=Number(formData.get('game_id'))
  const choice=String(formData.get('choice'))
  const total=Number(formData.get('game_total'))

  const {data:squad}=await supabase.from('squads').select('id').eq('id',squadId).eq('user_id',user.id).maybeSingle()
  if(!squad) redirect('/playoff-tiebreaker?error=owner')

  const {error}=await supabase.from('playoff_total_tiebreakers').upsert({
    playoff_matchup_id:matchupId,squad_id:squadId,game_id:gameId,choice,game_total:total,submitted_at:new Date().toISOString()
  },{onConflict:'playoff_matchup_id,squad_id'})

  if(error) redirect('/playoff-tiebreaker?error=save')
  redirect('/playoff-tiebreaker?saved=1')
}
