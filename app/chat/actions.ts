'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireUser(){
  const supabase=await createClient()

  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  return {
    supabase,
    user,
    commissioner:profile?.role==='commissioner'
  }
}

export async function postMessage(formData:FormData){
  const {supabase,user,commissioner}=await requireUser()

  const message=String(formData.get('message')||'').trim()
  if(!message) return

  const {data:squad}=await supabase
    .from('squads')
    .select('id')
    .eq('user_id',user.id)
    .eq('season_year',2026)
    .maybeSingle()

  await supabase.from('chat_messages').insert({
    user_id:user.id,
    squad_id:squad?.id || null,
    message,
    is_commissioner:commissioner
  })

  revalidatePath('/chat')
  revalidatePath('/dashboard')
  redirect('/chat')
}

export async function togglePinMessage(formData:FormData){
  const {supabase,commissioner}=await requireUser()
  if(!commissioner) redirect('/chat')

  const id=Number(formData.get('id'))
  const currentlyPinned=String(formData.get('is_pinned'))==='true'

  if(id){
    await supabase
      .from('chat_messages')
      .update({
        is_pinned:!currentlyPinned,
        pinned_at:currentlyPinned ? null : new Date().toISOString()
      })
      .eq('id',id)
  }

  revalidatePath('/chat')
  revalidatePath('/dashboard')
  redirect('/chat')
}

export async function deleteMessage(formData:FormData){
  const {supabase,user,commissioner}=await requireUser()

  const id=Number(formData.get('id'))
  if(!id) redirect('/chat')

  let query=supabase
    .from('chat_messages')
    .delete()
    .eq('id',id)

  if(!commissioner){
    query=query.eq('user_id',user.id)
  }

  await query

  revalidatePath('/chat')
  revalidatePath('/dashboard')
  redirect('/chat')
}