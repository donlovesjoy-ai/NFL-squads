 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../logout/actions'

export default async function Welcome(){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
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

  if(
    profile?.role==='commissioner' ||
    squad
  ){
    redirect('/dashboard')
  }

  return (
    <main
      className="wrap"
      style={{
        maxWidth:620
      }}
    >
      <section
        className="card"
        style={{
          textAlign:'center',
          paddingTop:40,
          paddingBottom:40
        }}
      >
        <div
          className="big"
          style={{
            marginBottom:6
          }}
        >
          NFL SQUADS
        </div>

        <div
          className="muted"
          style={{
            marginBottom:28
          }}
        >
          2026 Season
        </div>

        <h1>
          Welcome to NFL SQUADS
        </h1>

        <p
          style={{
            fontSize:'1.05rem',
            lineHeight:1.6,
            maxWidth:460,
            margin:'18px auto 0'
          }}
        >
          Your account has been
          created successfully.
        </p>

        <p
          style={{
            fontSize:'1.05rem',
            lineHeight:1.6,
            maxWidth:460,
            margin:'12px auto 26px',
            fontWeight:800
          }}
        >
          Please reach out to Michael
          for your team assignment.
        </p>

        <form action={logout}>
          <button
            className="submit"
            type="submit"
          >
            Log Out
          </button>
        </form>

      </section>
    </main>
  )
}