 'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireCommissioner(){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth
      .getUser()

  if(!user){
    redirect('/login')
  }

  const {
    data:profile
  }=
    await supabase
      .from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle()

  if(
    profile?.role!==
    'commissioner'
  ){
    redirect('/dashboard')
  }

  return supabase
}

export async function saveLiveFeed(
  formData:FormData
){
  const supabase=
    await requireCommissioner()

  const apiKey=
    String(
      formData.get(
        'api_key'
      )||''
    ).trim()

  const bookmaker=
    String(
      formData.get(
        'bookmaker'
      )||
      'draftkings'
    ).trim()

  const enabled=
    formData.get(
      'enabled'
    )==='on'

  const updateData:{
    bookmaker:string
    enabled:boolean
    updated_at:string
    api_key?:string
  }={
    bookmaker,
    enabled,
    updated_at:
      new Date()
        .toISOString()
  }

  /*
   * A blank API-key field means:
   * keep the existing stored key.
   *
   * This prevents the live-feed page
   * from needing to retrieve and expose
   * the saved secret.
   */
  if(apiKey){
    updateData.api_key=
      apiKey
  }

  const {error}=
    await supabase
      .from(
        'integration_settings'
      )
      .update(
        updateData
      )
      .eq(
        'id',
        1
      )

  if(error){
    redirect(
      '/commissioner/live-feed?error=save'
    )
  }

  revalidatePath(
    '/commissioner/live-feed'
  )

  redirect(
    '/commissioner/live-feed?saved=1'
  )
}

export async function runLiveSync(){
  const supabase=
    await requireCommissioner()

  const {
    data:{
      session
    }
  }=
    await supabase.auth
      .getSession()

  if(!session){
    redirect('/login')
  }

  const resp=
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-nfl-live`,
      {
        method:'POST',
        headers:{
          Authorization:
            `Bearer ${session.access_token}`,
          'content-type':
            'application/json'
        },
        body:'{}',
        cache:'no-store'
      }
    )

  if(!resp.ok){
    redirect(
      '/commissioner/live-feed?error=sync'
    )
  }

  revalidatePath(
    '/commissioner/live-feed'
  )

  revalidatePath(
    '/dashboard'
  )

  revalidatePath(
    '/my-pick'
  )

  redirect(
    '/commissioner/live-feed?synced=1'
  )
}