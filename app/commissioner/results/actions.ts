'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireCommissioner(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')
  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  if(profile?.role!=='commissioner') redirect('/dashboard')
  return supabase
}

export async function saveGameResult(formData:FormData){
  const supabase=await requireCommissioner()
  const id=Number(formData.get('game_id'))
  const spreadRaw=String(formData.get('spread')||'').trim()
  const homeRaw=String(formData.get('home_score')||'').trim()
  const awayRaw=String(formData.get('away_score')||'').trim()
  const status=String(formData.get('status')||'scheduled')

  const spread=spreadRaw==='' ? null : Number(spreadRaw)
  const home_score=homeRaw==='' ? null : Number(homeRaw)
  const away_score=awayRaw==='' ? null : Number(awayRaw)

  const {error}=await supabase.from('games').update({
    spread, home_score, away_score, status
  }).eq('id',id)

  if(error) redirect('/commissioner/results?error=1')
  revalidatePath('/standings')
  revalidatePath('/my-pick')
  revalidatePath('/dashboard')
  redirect('/commissioner/results?saved=1')
}
