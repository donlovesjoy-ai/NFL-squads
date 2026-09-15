'use server'

import { createClient } from '@/lib/supabase/server'

export async function recordAuthenticatedVisit(){
  const supabase=await createClient()
  const {data:{user},error:authError}=await supabase.auth.getUser()

  if(authError || !user){
    return false
  }

  const {error}=await supabase.rpc('record_hourly_visit')

  if(error){
    console.error('[activity] Failed to record authenticated visit',{
      userId:user.id,
      error:error.message
    })
    return false
  }

  return true
}
