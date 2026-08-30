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
  api_requests_used:number|null
  api_requests_remaining:number|null
  api_requests_last:number|null
  api_quota_total:number|null
  weekly_api_credits:number|null
  weekly_api_week_start:string|null
}

const WEEKLY_CREDIT_LIMIT=98

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
        'provider,bookmaker,enabled,last_sync_at,last_sync_status,last_sync_message,api_requests_used,api_requests_remaining,api_requests_last,api_quota_total,weekly_api_credits,weekly_api_week_start'
      )
      .eq(
        'id',
        1
      )
      .single()

  const settings=
    settingsData as LiveFeedSettings|null

  const weeklyUsed=
    settings?.weekly_api_credits ??
    0

  const weeklyRemaining=
    Math.max(
      WEEKLY_CREDIT_LIMIT-
      weeklyUsed,
      0
    )

  const weeklyPercent=
    Math.min(
      Math.max(
        weeklyUsed/
        WEEKLY_CREDIT_LIMIT*
        100,
        0
      ),
      100
    )

  const monthlyUsed=
    settings?.api_requests_used

  const monthlyRemaining=
    settings?.api_requests_remaining

  const monthlyTotal=
    settings?.api_quota_total

  const monthlyPercent=
    monthlyUsed!==null &&
    monthlyUsed!==undefined &&
    monthlyTotal!==null &&
    monthlyTotal!==undefined &&
    monthlyTotal>0
      ? Math.min(
          Math.max(
            monthlyUsed/
            monthlyTotal*
            100,
            0
          ),
          100
        )
      : null

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
          API Credit Usage
        </h2>

        <div
          style={{
            display:'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(220px,1fr))',
            gap:16,
            marginTop:16
          }}
        >
          <div
            style={{
              border:'1px solid #ddd',
              borderRadius:10,
              padding:16
            }}
          >
            <div
              className="muted"
              style={{
                fontWeight:700
              }}
            >
              NFL Squads Weekly Budget
            </div>

            <div
              style={{
                fontSize:'1.8rem',
                fontWeight:900,
                marginTop:4
              }}
            >
              {weeklyUsed} / {WEEKLY_CREDIT_LIMIT}
            </div>

            <div
              className="muted"
              style={{
                marginTop:2
              }}
            >
              {weeklyRemaining} credits remaining
            </div>

            <div
              style={{
                height:10,
                borderRadius:999,
                background:'#e5e5e5',
                overflow:'hidden',
                marginTop:12
              }}
            >
              <div
                style={{
                  height:'100%',
                  width:`${weeklyPercent}%`,
                  background:
                    weeklyUsed>=90
                      ? '#b91c1c'
                      : weeklyUsed>=72
                        ? '#b45309'
                        : '#15803d'
                }}
              />
            </div>

            <p
              className="muted"
              style={{
                marginBottom:0
              }}
            >
              Weekly counter resets Monday ET.
              NFL Squads begins conserving credits
              at 72 and will not exceed the
              98-credit weekly safety limit.
            </p>
          </div>

          <div
            style={{
              border:'1px solid #ddd',
              borderRadius:10,
              padding:16
            }}
          >
            <div
              className="muted"
              style={{
                fontWeight:700
              }}
            >
              The Odds API Account
            </div>

            {monthlyUsed!==null &&
             monthlyUsed!==undefined &&
             monthlyRemaining!==null &&
             monthlyRemaining!==undefined ? (
              <>
                <div
                  style={{
                    fontSize:'1.8rem',
                    fontWeight:900,
                    marginTop:4
                  }}
                >
                  {monthlyUsed}
                  {monthlyTotal
                    ? ` / ${monthlyTotal}`
                    : ''}
                </div>

                <div
                  className="muted"
                  style={{
                    marginTop:2
                  }}
                >
                  {monthlyRemaining} credits remaining
                </div>

                {monthlyPercent!==null && (
                  <div
                    style={{
                      height:10,
                      borderRadius:999,
                      background:'#e5e5e5',
                      overflow:'hidden',
                      marginTop:12
                    }}
                  >
                    <div
                      style={{
                        height:'100%',
                        width:`${monthlyPercent}%`,
                        background:
                          monthlyPercent>=90
                            ? '#b91c1c'
                            : monthlyPercent>=75
                              ? '#b45309'
                              : '#15803d'
                      }}
                    />
                  </div>
                )}

                <p
                  className="muted"
                  style={{
                    marginBottom:0
                  }}
                >
                  These numbers come directly
                  from The Odds API usage headers.
                </p>
              </>
            ):(
              <p
                className="muted"
                style={{
                  marginBottom:0
                }}
              >
                Usage information will appear
                after the next successful
                The Odds API request.
              </p>
            )}
          </div>
        </div>

        {settings?.api_requests_last!==null &&
         settings?.api_requests_last!==undefined && (
          <p
            className="muted"
            style={{
              marginTop:14
            }}
          >
            Last API request used{' '}
            <b>
              {settings.api_requests_last}
            </b>{' '}
            credit
            {settings.api_requests_last===1
              ? ''
              : 's'}.
          </p>
        )}
      </section>

      <section className="card">
        <h2>
          Automatic NFL Feed
        </h2>

        <p>
          NFL Squads uses a credit-controlled
          polling schedule designed to remain
          below 100 API credits per NFL week.
          Odds requests are concentrated near
          kickoff, when line accuracy matters
          most.
        </p>

        <p>
          On non-game days, odds are checked
          approximately once per day. On game
          days, additional checks are concentrated
          around approximately six hours, two
          hours, one hour, 30 minutes, 15 minutes,
          five minutes, and one minute before
          kickoff.
        </p>

        <p>
          Once a game begins, odds polling for
          that kickoff window stops. Live scores
          are checked approximately every
          30 minutes until games are final.
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
              ).toLocaleString(
                'en-US',
                {
                  timeZone:
                    'America/New_York',
                  timeZoneName:'short'
                }
              )
            : 'Never'}
        </p>

        {settings?.weekly_api_week_start && (
          <p>
            <b>
              Current API week:
            </b>{' '}
            {settings.weekly_api_week_start}
          </p>
        )}

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