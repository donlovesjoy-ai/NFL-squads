'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function safeNext(value:string){
  if(
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ){
    return '/dashboard'
  }

  try{
    const parsed=
      new URL(
        value,
        'https://nfl-squads.vercel.app'
      )

    if(
      parsed.origin !==
      'https://nfl-squads.vercel.app'
    ){
      return '/dashboard'
    }

    return (
      parsed.pathname +
      parsed.search +
      parsed.hash
    )
  }catch{
    return '/dashboard'
  }
}

export async function login(
  formData:FormData
){
  const supabase=
    await createClient()

  const email=
    String(
      formData.get('email')||''
    )

  const password=
    String(
      formData.get('password')||''
    )

  const next=
    safeNext(
      String(
        formData.get('next')||''
      )
    )

  const {error}=
    await supabase.auth
      .signInWithPassword({
        email,
        password
      })

  if(error){
    const encodedNext=
      encodeURIComponent(next)

    redirect(
      `/login?error=1&next=${encodedNext}`
    )
  }

  redirect(next)
}