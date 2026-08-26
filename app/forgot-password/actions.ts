 'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function sendPasswordReset(
  formData:FormData
){
  const supabase=
    await createClient()

  const email=
    String(
      formData.get('email')||''
    )
      .trim()
      .toLowerCase()

  if(!email){
    redirect(
      '/forgot-password?error=1'
    )
  }

  const headerStore=
    await headers()

  const forwardedHost=
    headerStore.get(
      'x-forwarded-host'
    )

  const host=
    forwardedHost ||
    headerStore.get('host')

  const protocol=
    headerStore.get(
      'x-forwarded-proto'
    ) ||
    (
      host?.includes('localhost')
        ? 'http'
        : 'https'
    )

  if(!host){
    redirect(
      '/forgot-password?error=1'
    )
  }

  const origin=
    `${protocol}://${host}`

  const {error}=
    await supabase.auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${origin}/auth/callback?next=/reset-password`
        }
      )

  if(error){
    redirect(
      '/forgot-password?error=1'
    )
  }

  redirect(
    '/forgot-password?sent=1'
  )
}