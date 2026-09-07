import Link from 'next/link'
import { login } from './actions'
import PasswordInput from '../components/PasswordInput'

function safeNext(value?:string){
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

export default async function Login({
  searchParams
}:{
  searchParams:Promise<{
    error?:string
    created?:string
    reset?:string
    next?:string
  }>
}){
  const p=
    await searchParams

  const next=
    safeNext(p.next)

  const signupHref=
    next==='/dashboard'
      ? '/signup'
      : `/signup?next=${
          encodeURIComponent(next)
        }`

  return (
    <main
      className="wrap"
      style={{
        maxWidth:460
      }}
    >
      <div className="card">

        <h1>
          NFL SQUADS
        </h1>

        <p className="muted">
          2026 League Login
        </p>

        {p.error && (
          <p className="status">
            Login failed. Check your
            email and password.
          </p>
        )}

        {p.created && (
          <p className="status">
            Account created. Check your
            email if confirmation is required,
            then log in.
          </p>
        )}

        {p.reset && (
          <p className="status">
            Your password has been updated.
            You may now log in.
          </p>
        )}

        <form action={login}>

          <input
            type="hidden"
            name="next"
            value={next}
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            required
          />

          <PasswordInput
            name="password"
            placeholder="Password"
          />

          <button
            className="submit"
            type="submit"
          >
            Log in
          </button>

        </form>

        <p>
          <Link href="/forgot-password">
            Forgot password?
          </Link>
        </p>

        <p>
          <Link href={signupHref}>
            Create account
          </Link>
        </p>

      </div>
    </main>
  )
}