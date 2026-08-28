 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'
import {
  saveLiveFeed,
  runLiveSync
} from './actions'

type LiveFeedSettings={
  provider:string|null
  bookmaker:string|null
  enabled:boolean|null
  last_sync_at:string|null
  last_sync_status:string|null
  last_sync_message:string|null
}

export default async function LiveFeed({
  searchParams
}:{
  searchParams:Promise<{
    saved?:string
    synced?:string
    error?:string
  }>
}){
  const sp=
    await searchParams

  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth
      .getUser()

  if(!user){
    redirect('/login')
  }

  const {
    data:profile
  }=
    await supabase
      .from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle()

  if(
    profile?.role!==
    'commissioner'
  ){
    redirect('/dashboard')
  }

  const {
    data:settingsData
  }=
    await supabase
      .from(
        'integration_settings'
      )
      .select(
        'provider,bookmaker,enabled,last_sync_at,last_sync_status,last_sync_message'
      )
      .eq(
        'id',
        1
      )
      .single()

  const settings=
    settingsData as LiveFeedSettings|null

  return (
    <main className="wrap">
      <div className="top">
        <div>
          <div className="big">
            NFL SQUADS
          </div>

          <div className="muted">
            Commissioner — Live Odds & Results
          </div>
        </div>
      </div>

      <Nav commissioner/>

      {sp.saved && (
        <p className="status">
          Live-feed settings saved.
        </p>
      )}

      {sp.synced && (
        <p className="status">
          Live sync completed.
        </p>
      )}

      {sp.error && (
        <p className="status">
          Live feed error: {sp.error}
        </p>
      )}

      <section className="card">
        <h2>
          Automatic NFL Feed
        </h2>

        <p>
          The feed checks scores every minute
          during active game windows and
          refreshes odds every five minutes
          near kickoff. Outside active windows
          it automatically reduces calls.
        </p>

        <p>
          <b>
            Official league line:
          </b>{' '}
          the selected bookmaker&apos;s spread
          and game total update before kickoff,
          then freeze at kickoff as the closing
          line.
        </p>

        <form
          action={saveLiveFeed}
        >
          <label>
            The Odds API key
          </label>

          <input
            name="api_key"
            type="password"
            defaultValue=""
            placeholder="Enter new API key only to replace current key"
            autoComplete="new-password"
          />

          <p
            className="muted"
            style={{
              marginTop:4
            }}
          >
            Leave blank to keep the existing
            saved API key.
          </p>

          <label>
            Official bookmaker
          </label>

          <select
            name="bookmaker"
            defaultValue={
              settings?.bookmaker ||
              'draftkings'
            }
          >
            <option value="draftkings">
              DraftKings
            </option>

            <option value="fanduel">
              FanDuel
            </option>

            <option value="betmgm">
              BetMGM
            </option>

            <option value="caesars">
              Caesars
            </option>
          </select>

          <label
            style={{
              display:'flex',
              gap:10,
              alignItems:'center'
            }}
          >
            <input
              style={{
                width:'auto'
              }}
              type="checkbox"
              name="enabled"
              defaultChecked={
                !!settings?.enabled
              }
            />

            Enable automatic live sync
          </label>

          <button
            className="submit"
            type="submit"
          >
            Save Live Feed
          </button>
        </form>
      </section>

      <section className="card">
        <h2>
          Feed Status
        </h2>

        <p>
          <b>
            Status:
          </b>{' '}
          {settings?.last_sync_status ||
           'Not run yet'}
        </p>

        <p>
          <b>
            Last sync:
          </b>{' '}
          {settings?.last_sync_at
            ? new Date(
                settings.last_sync_at
              ).toLocaleString()
            : 'Never'}
        </p>

        <p className="muted">
          {settings?.last_sync_message ||
           ''}
        </p>

        <form
          action={runLiveSync}
        >
          <button
            className="submit"
            type="submit"
          >
            Run Sync Now
          </button>
        </form>
      </section>
    </main>
  )
}