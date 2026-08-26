 import Link from 'next/link'
import { login } from './actions'
import PasswordInput from '../components/PasswordInput'

export default async function Login({
  searchParams
}:{
  searchParams:Promise<{
    error?:string
    created?:string
  }>
}){
  const p=
    await searchParams

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

        <form action={login}>

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
          <Link href="/signup">
            Create account
          </Link>
        </p>

      </div>
    </main>
  )
}