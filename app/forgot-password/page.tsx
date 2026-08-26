 import Link from 'next/link'
import { sendPasswordReset } from './actions'

export default async function ForgotPassword({
  searchParams
}:{
  searchParams:Promise<{
    sent?:string
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
          Reset Password
        </h1>

        <p className="muted">
          Enter the email address
          associated with your
          NFL Squads account.
        </p>

        {sp.sent && (
          <p className="status">
            Password reset email sent.
            Check your inbox and follow
            the link to choose a new password.
          </p>
        )}

        {sp.error && (
          <p className="status">
            Unable to send the password
            reset email. Please try again.
          </p>
        )}

        {!sp.sent && (
          <form
            action={sendPasswordReset}
          >
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
            />

            <button
              className="submit"
              type="submit"
            >
              Send Reset Email
            </button>
          </form>
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