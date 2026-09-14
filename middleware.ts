import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

type CookieToSet={
  name:string
  value:string
  options?:any
}

const AUTH_DEADLINE_MS=2500
const ACCESS_DEADLINE_MS=1500

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

export async function middleware(
  request:NextRequest,
  event:NextFetchEvent
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

  let user:any=null

  try{
    const authResult=
      await withDeadline(
        supabase.auth.getUser(),
        AUTH_DEADLINE_MS
      )

    user=authResult.data.user
  }catch(error){
    console.error(
      '[middleware] Auth check timed out; continuing request',
      {
        path:request.nextUrl.pathname,
        error:
          error instanceof Error
            ? error.message
            : String(error)
      }
    )

    response.headers.set(
      'Cache-Control',
      'private, no-store'
    )

    return response
  }

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

  // Activity tracking should never delay navigation. Let the platform finish it
  // after the response has already been released to the browser.
  event.waitUntil(
    Promise.resolve(
      supabase.rpc('record_hourly_visit')
    )
      .then(()=>undefined)
      .catch(
        error=>{
          console.error(
            '[middleware] Hourly visit tracking failed',
            {
              path:request.nextUrl.pathname,
              error:
                error instanceof Error
                  ? error.message
                  : String(error)
            }
          )
        }
      )
  )

  try{
    const [
      {data:profile},
      {data:squad}
    ]=
      await withDeadline(
        Promise.all([
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
        ]),
        ACCESS_DEADLINE_MS
      )

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
  }catch(error){
    // Authorization is still enforced by Supabase/RLS and protected pages.
    // If this convenience routing lookup is slow, availability wins over a 504.
    console.error(
      '[middleware] Access routing check timed out; continuing request',
      {
        path:request.nextUrl.pathname,
        error:
          error instanceof Error
            ? error.message
            : String(error)
      }
    )
  }

  response.headers.set(
    'Cache-Control',
    'private, no-store'
  )

  return response
}

export const config={
  matcher:[
    '/',
    '/dashboard/:path*',
    '/my-pick/:path*',
    '/schedule/:path*',
    '/standings/:path*',
    '/squads/:path*',
    '/playoffs/:path*',
    '/playoff-tiebreaker/:path*',
    '/chat/:path*',
    '/rules/:path*',
    '/audit-log/:path*',
    '/notifications/:path*',
    '/commissioner/:path*'
  ]
}
