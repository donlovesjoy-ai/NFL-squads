'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const SIGN_IN_DEADLINE_MS=8000
const ACTIVITY_DEADLINE_MS=1500

async function withDeadline<T>(
  work:Promise<T>,
  milliseconds:number
):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined

  try{
    return await Promise.race([
      work,
      new Promise<never>(
        (_,reject)=>{
          timer=setTimeout(
            ()=>reject(
              new Error(
                `Operation exceeded ${milliseconds}ms`
              )
            ),
            milliseconds
          )
        }
      )
    ])
  }finally{
    if(timer){
      clearTimeout(timer)
    }
  }
}

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

  try{
    const {error}=
      await withDeadline(
        supabase.auth
          .signInWithPassword({
            email,
            password
          }),
        SIGN_IN_DEADLINE_MS
      )

    if(error){
      const encodedNext=
        encodeURIComponent(next)

      redirect(
        `/login?error=1&next=${encodedNext}`
      )
    }
  }catch{
    const encodedNext=
      encodeURIComponent(next)

    redirect(
      `/login?error=1&next=${encodedNext}`
    )
  }

  // Login telemetry is useful, but it must never prevent a successful login.
  try{
    await withDeadline(
      supabase.rpc('record_login_activity'),
      ACTIVITY_DEADLINE_MS
    )
  }catch(error){
    console.error(
      '[login] Activity tracking failed; completing sign-in',
      error instanceof Error
        ? error.message
        : String(error)
    )
  }

  redirect(next)
}
