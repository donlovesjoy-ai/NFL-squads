 'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordInput from '../components/PasswordInput'
import { createClient } from '@/lib/supabase/client'

export default function ResetPassword(){
  const router=
    useRouter()

  const [ready,setReady]=
    useState(false)

  const [error,setError]=
    useState('')

  const [saving,setSaving]=
    useState(false)

  useEffect(()=>{
    const supabase=
      createClient()

    const verifySession=
      async()=>{
        const {
          data:{
            user
          },
          error
        }=
          await supabase.auth
            .getUser()

        if(
          error ||
          !user
        ){
          setError(
            'Your reset link is invalid or has expired. Please request a new password reset email.'
          )

          return
        }

        setReady(true)
      }

    verifySession()
  },[])

  async function handleSubmit(
    formData:FormData
  ){
    setError('')

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

    if(password.length<8){
      setError(
        'Password must be at least 8 characters.'
      )

      return
    }

    if(
      password!==confirmPassword
    ){
      setError(
        'The passwords do not match.'
      )

      return
    }

    setSaving(true)

    const supabase=
      createClient()

    const {
      data:{
        user
      },
      error:userError
    }=
      await supabase.auth
        .getUser()

    if(
      userError ||
      !user
    ){
      setSaving(false)

      setError(
        'Your reset session has expired. Please request a new reset email.'
      )

      return
    }

    const {
      error:updateError
    }=
      await supabase.auth
        .updateUser({
          password
        })

    if(updateError){
      setSaving(false)

      setError(
        updateError.message ||
        'Unable to update your password.'
      )

      return
    }

    await supabase.auth
      .signOut()

    router.replace(
      '/login?reset=1'
    )

    router.refresh()
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
          Choose New Password
        </h1>

        {!ready &&
         !error && (
          <p className="muted">
            Verifying your reset link...
          </p>
        )}

        {error && (
          <p className="status">
            {error}
          </p>
        )}

        {ready && (
          <>
            <p className="muted">
              Enter your new NFL Squads
              password below.
            </p>

            <form
              action={handleSubmit}
              style={{
                display:'grid',
                gap:10
              }}
            >
              <PasswordInput
                name="password"
                minLength={8}
                placeholder="New password"
              />

              <PasswordInput
                name="confirm_password"
                minLength={8}
                placeholder="Confirm new password"
              />

              <button
                className="submit"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Updating Password...'
                  : 'Update Password'}
              </button>
            </form>
          </>
        )}

      </div>
    </main>
  )
}