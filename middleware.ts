import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type CookieToSet={
  name:string
  value:string
  options?:any
}

function copyCookies(
  from:NextResponse,
  to:NextResponse
){
  from.cookies
    .getAll()
    .forEach(
      cookie=>{
        to.cookies.set(cookie)
      }
    )

  return to
}

export async function middleware(
  request:NextRequest
){
  let response=
    NextResponse.next({
      request
    })

  const supabase=
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies:{
          getAll(){
            return request.cookies.getAll()
          },

          setAll(
            cookiesToSet:CookieToSet[]
          ){
            cookiesToSet.forEach(
              ({
                name,
                value
              })=>{
                request.cookies.set(
                  name,
                  value
                )
              }
            )

            response=
              NextResponse.next({
                request
              })

            cookiesToSet.forEach(
              ({
                name,
                value,
                options
              })=>{
                response.cookies.set(
                  name,
                  value,
                  options
                )
              }
            )
          }
        }
      }
    )

  const {
    data:{
      user
    }
  }=
    await supabase.auth.getUser()

  if(!user){
    const redirectResponse=
      NextResponse.redirect(
        new URL(
          '/login',
          request.url
        )
      )

    return copyCookies(
      response,
      redirectResponse
    )
  }

  const [
    {data:profile},
    {data:squad}
  ]=
    await Promise.all([

      supabase
        .from('users')
        .select('role')
        .eq(
          'id',
          user.id
        )
        .maybeSingle(),

      supabase
        .from('squads')
        .select('id')
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'season_year',
          2026
        )
        .maybeSingle()

    ])

  const commissioner=
    profile?.role==='commissioner'

  const assigned=
    Boolean(squad)

  if(
    !commissioner &&
    !assigned
  ){
    const redirectResponse=
      NextResponse.redirect(
        new URL(
          '/welcome',
          request.url
        )
      )

    return copyCookies(
      response,
      redirectResponse
    )
  }

  return response
}

export const config={
  matcher:[
    '/',
    '/dashboard/:path*',
    '/my-pick/:path*',
    '/schedule/:path*',
    '/standings/:path*',
    '/playoffs/:path*',
    '/playoff-tiebreaker/:path*',
    '/chat/:path*',
    '/commissioner/:path*'
  ]
}
