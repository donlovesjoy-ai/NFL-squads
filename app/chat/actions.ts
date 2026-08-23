 'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function postMessage(formData:FormData){
  const supabase=await createClient()

  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const message=String(formData.get('message')||'').trim()
  if(!message) return

  const [{data:profile},{data:squad}] = await Promise.all([
    supabase.from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle(),

    supabase.from('squads')
      .select('id')
      .eq('user_id',user.id)
      .eq('season_year',2026)
      .maybeSingle()
  ])

  await supabase.from('chat_messages').insert({
    user_id:user.id,
    squad_id:squad?.id || null,
    message,
    is_commissioner:profile?.role==='commissioner'
  })

  revalidatePath('/chat')
  redirect('/chat')
}