 'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updatePassword(
  formData:FormData
){
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
    redirect(
      '/login?error=1'
    )
  }

  const password=
    String(
      formData.get(
        'password'
      )||''
    )

  const confirmPassword=
    String(
      formData.get(
        'confirm_password'
      )||''
    )

  if(
    password.length<8
  ){
    redirect(
      '/reset-password?error=length'
    )
  }

  if(
    password!==confirmPassword
  ){
    redirect(
      '/reset-password?error=match'
    )
  }

  const {error}=
    await supabase.auth
      .updateUser({
        password
      })

  if(error){
    redirect(
      '/reset-password?error=update'
    )
  }

  await supabase.auth.signOut()

  redirect(
    '/login?reset=1'
  )
}