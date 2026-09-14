import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

type AuthWithClaims = {
  getClaims?: () => Promise<unknown>
  getUser: () => Promise<unknown>
}

const AUTH_REFRESH_DEADLINE_MS = 2500

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const auth = supabase.auth as unknown as AuthWithClaims
  const authCheck =
    typeof auth.getClaims === 'function' ? auth.getClaims() : auth.getUser()

  try {
    await withDeadline(authCheck, AUTH_REFRESH_DEADLINE_MS)
  } catch (error) {
    console.error('[middleware] Auth refresh failed; continuing request', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Middleware only refreshes the session. Protected pages and server actions
  // verify the user/role themselves, which keeps database work out of the
  // global request path and prevents one slow query from taking down the site.
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

async function withDeadline<T>(work: Promise<T>, milliseconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Auth refresh exceeded ${milliseconds}ms`)),
          milliseconds
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const config = {
  matcher: [
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
    '/commissioner/:path*',
  ],
}
