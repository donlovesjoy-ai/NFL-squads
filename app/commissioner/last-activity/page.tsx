import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'

export const dynamic = 'force-dynamic'

function formatEastern(value: string) {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function inactiveFor(value: string | null) {
  if (!value) return 'Never recorded'

  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  const hours = Math.floor(elapsed / 3_600_000)
  const days = Math.floor(elapsed / 86_400_000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default async function LastActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const [{ data: squads, error: squadsError }, { data: activity, error: activityError }] =
    await Promise.all([
      supabase
        .from('squads')
        .select('user_id,owner_name,squad_name')
        .eq('season_year', 2026)
        .neq('user_id', user.id),
      supabase.rpc('get_owner_last_activity'),
    ])

  if (squadsError || activityError) {
    throw new Error(squadsError?.message || activityError?.message || 'Unable to load owner activity')
  }

  const activityByOwner = new Map(
    (activity || []).map((row: any) => [row.user_id, row.last_activity as string | null])
  )

  const rows = (squads || [])
    .map((squad: any) => ({
      ...squad,
      lastActivity: activityByOwner.get(squad.user_id) || null,
    }))
    .sort((a: any, b: any) => {
      if (!a.lastActivity && b.lastActivity) return -1
      if (a.lastActivity && !b.lastActivity) return 1
      if (a.lastActivity && b.lastActivity) {
        const difference =
          new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
        if (difference !== 0) return difference
      }
      return (a.owner_name || '').localeCompare(b.owner_name || '')
    })

  const neverRecorded = rows.filter((row: any) => !row.lastActivity).length

  return (
    <main className="wrap">
      <div className="top" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: '100%' }}>
          <div className="big">NFL SQUADS</div>
          <div className="muted">Commissioner — Owner Activity</div>
        </div>
      </div>

      <Nav commissioner={true} />

      <section className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center' }}>Last Activity Report</h1>

        <p className="muted" style={{ textAlign: 'center', fontSize: '0.84rem' }}>
          Owners with no recorded activity appear first, followed by the least recently active.
          The most recently active owner appears last.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            flexWrap: 'wrap',
            margin: '18px 0 8px',
            fontWeight: 800,
          }}
        >
          <span>{rows.length} owners</span>
          <span>{neverRecorded} never recorded</span>
        </div>

        {rows.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center' }}>
            No squad owners were found.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '10px 8px' }}>Owner</th>
                  <th style={{ padding: '10px 8px' }}>Squad</th>
                  <th style={{ padding: '10px 8px' }}>Last Activity</th>
                  <th style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>Inactive For</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, index: number) => (
                  <tr key={row.user_id} style={{ background: row.lastActivity ? undefined : '#fff1f1' }}>
                    <td
                      style={{
                        padding: '11px 8px',
                        borderTop: '1px solid #e5e5e5',
                        textAlign: 'center',
                        fontWeight: 900,
                      }}
                    >
                      {index + 1}
                    </td>
                    <td style={{ padding: '11px 8px', borderTop: '1px solid #e5e5e5', fontWeight: 800 }}>
                      {row.owner_name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '11px 8px', borderTop: '1px solid #e5e5e5' }}>
                      {row.squad_name || '—'}
                    </td>
                    <td
                      style={{
                        padding: '11px 8px',
                        borderTop: '1px solid #e5e5e5',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.lastActivity ? formatEastern(row.lastActivity) : 'No activity recorded'}
                    </td>
                    <td
                      style={{
                        padding: '11px 8px',
                        borderTop: '1px solid #e5e5e5',
                        whiteSpace: 'nowrap',
                        fontWeight: 800,
                        color: row.lastActivity ? undefined : '#b42318',
                      }}
                    >
                      {inactiveFor(row.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="muted" style={{ textAlign: 'center', fontSize: '0.76rem', marginTop: 18 }}>
          Updated whenever this page is opened. Times are shown in Eastern time.
        </p>
      </section>
    </main>
  )
}
