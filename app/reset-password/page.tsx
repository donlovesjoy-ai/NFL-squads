 import PasswordInput from '../components/PasswordInput'
import { updatePassword } from './actions'

export default async function ResetPassword({
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

        <p className="muted">
          Enter your new NFL Squads
          password below.
        </p>

        {sp.error==='length' && (
          <p className="status">
            Password must be at least
            8 characters.
          </p>
        )}

        {sp.error==='match' && (
          <p className="status">
            The passwords do not match.
          </p>
        )}

        {sp.error==='update' && (
          <p className="status">
            Unable to update your password.
            Please request a new reset link.
          </p>
        )}

        <form
          action={updatePassword}
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
          >
            Update Password
          </button>

        </form>

      </div>
    </main>
  )
}