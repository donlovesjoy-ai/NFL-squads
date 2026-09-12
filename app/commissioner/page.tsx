import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import { logout } from '../logout/actions'
import CommissionerHubActions from './CommissionerHubActions'

export default async function CommissionerHub() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'commissioner') {
    redirect('/dashboard')
  }

  return (
    <main className="wrap">
      <div
        className="top"
        style={{
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ width: '100%' }}>
          <div className="big">NFL SQUADS</div>
          <div className="muted">Commissioner Shit</div>
        </div>
      </div>

      <Nav commissioner={true} />

      <div
        style={{
          width: '100%',
          padding: '18px 0 32px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0 }}>Commissioner Shit</h1>

        <CommissionerHubActions />

        <form action={logout} style={{ marginTop: 18 }}>
          <button
            type="submit"
            style={{
              border: '1px solid #d8d8d8',
              background: '#fff',
              borderRadius: 10,
              padding: '10px 16px',
              font: 'inherit',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Log Out
          </button>
        </form>
      </div>
    </main>
  )
}
