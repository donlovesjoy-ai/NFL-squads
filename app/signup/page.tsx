 import Link from 'next/link'
import { signup } from './actions'
import PasswordInput from '../components/PasswordInput'

export default async function Signup({
  searchParams
}:{
  searchParams:Promise<{
    error?:string
  }>
}){
  const sp=
    await searchParams

  return (
    <main
      className="wrap"
      style={{
        maxWidth:480
      }}
    >
      <div className="card">

        <h1>
          Create NFL Squads Account
        </h1>

        <p className="muted">
          The first account created becomes
          the commissioner account. Later
          accounts become owners.
        </p>

        {sp.error && (
          <p className="status">
            Unable to create the account.
          </p>
        )}

        <form action={signup}>

          <input
            name="email"
            type="email"
            placeholder="Email"
            required
          />

          <PasswordInput
            name="password"
            minLength={8}
            placeholder="Password (8+ characters)"
          />

          <button
            className="submit"
            type="submit"
          >
            Create Account
          </button>

        </form>

        <p>
          <Link href="/login">
            Already have an account? Log in
          </Link>
        </p>

      </div>
    </main>
  )
}