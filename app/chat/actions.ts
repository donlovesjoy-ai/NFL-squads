'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const MAX_IMAGE_SIZE=10*1024*1024

const allowedImageTypes=new Map([
  ['image/png','png'],
  ['image/jpeg','jpg'],
  ['image/webp','webp'],
  ['image/gif','gif']
])

const allowedReactionEmojis=new Set([
  '👍','👎','❤️','😂','🔥','👏','🏈','🍺','💯','😮'
])

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

async function reactionReturnPath(){
  const requestHeaders=await headers()
  const referer=requestHeaders.get('referer')||''

  try{
    const pathname=new URL(referer).pathname

    if(pathname==='/' || pathname==='/dashboard'){
      return '/dashboard'
    }
  }catch{
    // Fall through to chat.
  }

  return '/chat'
}

function cleanGifUrl(value:string){
  const raw=value.trim()
  if(!raw) return null

  try{
    const url=new URL(raw)
    if(url.protocol!=='https:') return null
    return url.toString()
  }catch{
    return null
  }
}

export async function postMessage(formData:FormData){
  const {supabase,user,commissioner}=await requireUser()

  const message=String(formData.get('message')||'').trim().slice(0,500)
  const gifUrl=cleanGifUrl(String(formData.get('gif_url')||''))
  const replyValue=Number(formData.get('reply_to_id'))
  const replyToId=Number.isInteger(replyValue) && replyValue>0
    ? replyValue
    : null

  const image=formData.get('image')
  let imagePath:string|null=null

  if(image instanceof File && image.size>0){
    const extension=allowedImageTypes.get(image.type)

    if(!extension || image.size>MAX_IMAGE_SIZE){
      redirect(replyToId ? `/chat?reply=${replyToId}#composer` : '/chat#composer')
    }

    imagePath=`${user.id}/${crypto.randomUUID()}.${extension}`

    const {error:uploadError}=await supabase.storage
      .from('chat-media')
      .upload(imagePath,image,{
        contentType:image.type,
        cacheControl:'3600',
        upsert:false
      })

    if(uploadError){
      imagePath=null
    }
  }

  if(!message && !gifUrl && !imagePath){
    redirect(replyToId ? `/chat?reply=${replyToId}#composer` : '/chat#composer')
  }

  const {data:squad}=await supabase
    .from('squads')
    .select('id')
    .eq('user_id',user.id)
    .eq('season_year',2026)
    .maybeSingle()

  const {error:insertError}=await supabase.from('chat_messages').insert({
    user_id:user.id,
    squad_id:squad?.id || null,
    message,
    is_commissioner:commissioner,
    reply_to_id:replyToId,
    image_path:imagePath,
    gif_url:gifUrl
  })

  if(insertError && imagePath){
    await supabase.storage
      .from('chat-media')
      .remove([imagePath])
  }

  revalidatePath('/chat')
  revalidatePath('/dashboard')
  redirect('/chat')
}

export async function toggleReaction(formData:FormData){
  const returnPath=await reactionReturnPath()
  const {supabase,user}=await requireUser()

  const messageId=Number(formData.get('message_id'))
  const emoji=String(formData.get('emoji')||'')

  if(!Number.isInteger(messageId) || messageId<=0 || !allowedReactionEmojis.has(emoji)){
    redirect(returnPath)
  }

  const {data:message}=await supabase
    .from('chat_messages')
    .select('id,is_system')
    .eq('id',messageId)
    .maybeSingle()

  if(!message || message.is_system===true){
    redirect(returnPath)
  }

  const {data:existing}=await supabase
    .from('chat_message_reactions')
    .select('id')
    .eq('message_id',messageId)
    .eq('user_id',user.id)
    .eq('emoji',emoji)
    .maybeSingle()

  if(existing?.id){
    await supabase
      .from('chat_message_reactions')
      .delete()
      .eq('id',existing.id)
  }else{
    await supabase
      .from('chat_message_reactions')
      .insert({
        message_id:messageId,
        user_id:user.id,
        emoji
      })
  }

  revalidatePath('/chat')
  revalidatePath('/dashboard')
  redirect(returnPath)
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
