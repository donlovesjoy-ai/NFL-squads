 'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

function createRecoveryClient(){
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth:{
        autoRefreshToken:true,
        persistSession:true,
        detectSessionInUrl:true
      }
    }
  )
}

export default function ForgotPassword(){
  const [email,setEmail]=useState('')
  const [sent,setSent]=useState(false)
  const [error,setError]=useState('')
  const [sending,setSending]=useState(false)

  async function handleSubmit(
    event:React.FormEvent<HTMLFormElement>
  ){
    event.preventDefault()

    setError('')
    setSending(true)

    const supabase=
      createRecoveryClient()

    const {error}=
      await supabase.auth
        .resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo:
              `${window.location.origin}/reset-password`
          }
        )

    setSending(false)

    if(error){
      setError(
        error.message ||
        'Unable to send the password reset email. Please try again.'
      )

      return
    }

    setSent(true)
  }

  return (
    <main
      className="wrap"
      style={{
        maxWidth:460
      }}
    >
      <div
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h1>
          Reset Password
        </h1>

        <p className="muted">
          Enter the email address
          associated with your
          NFL Squads account.
        </p>

        {sent ? (
          <p className="status">
            Password reset email sent.
            Check your inbox and follow
            the link to choose a new password.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
          >
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={
                event=>
                  setEmail(
                    event.target.value
                  )
              }
              required
            />

            <button
              className="submit"
              type="submit"
              disabled={sending}
            >
              {sending
                ? 'Sending...'
                : 'Send Reset Email'}
            </button>
          </form>
        )}

        {error && (
          <p className="status">
            {error}
          </p>
        )}

        <p>
          <Link href="/login">
            Back to login
          </Link>
        </p>

      </div>
    </main>
  )
}