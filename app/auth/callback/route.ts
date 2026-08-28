 import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PRODUCTION_ORIGIN=
  'https://nfl-squads.vercel.app'

function getTrustedOrigin(){
  const configuredOrigin=
    process.env.NEXT_PUBLIC_SITE_URL
      ?.trim()

  if(!configuredOrigin){
    return PRODUCTION_ORIGIN
  }

  try{
    const url=
      new URL(
        configuredOrigin
      )

    return url.origin
  }catch{
    return PRODUCTION_ORIGIN
  }
}

function getSafeNext(
  value:string|null
){
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
        PRODUCTION_ORIGIN
      )

    if(
      parsed.origin !==
      PRODUCTION_ORIGIN
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

export async function GET(
  request:Request
){
  const requestUrl=
    new URL(
      request.url
    )

  const trustedOrigin=
    getTrustedOrigin()

  const code=
    requestUrl.searchParams
      .get('code')

  const next=
    getSafeNext(
      requestUrl.searchParams
        .get('next')
    )

  if(!code){
    return NextResponse.redirect(
      new URL(
        '/login?error=1',
        trustedOrigin
      )
    )
  }

  const supabase=
    await createClient()

  const {error}=
    await supabase.auth
      .exchangeCodeForSession(
        code
      )

  if(error){
    return NextResponse.redirect(
      new URL(
        '/forgot-password?expired=1',
        trustedOrigin
      )
    )
  }

  return NextResponse.redirect(
    new URL(
      next,
      trustedOrigin
    )
  )
}