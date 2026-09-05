import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage(){
  const supabase=await createClient()

  const {
    data:{user}
  }=await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  if(profile?.role!=='commissioner'){
    redirect('/dashboard')
  }

  return <NotificationsClient />
}
