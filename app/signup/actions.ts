}'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error(error)
    redirect('/signup?error=1')
  }

  // If no commissioner exists yet, the first account claims that role.
  if (data.session) {
    await supabase.rpc('claim_initial_commissioner')
    redirect('/dashboard')
  }

  redirect('/login?created=1')
}
