 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'
import {
  postMessage,
  togglePinMessage,
  deleteMessage
} from './actions'

function formatTime(value:string){
  return new Date(value).toLocaleString(
    'en-US',
    {
      timeZone:'America/New_York',
      month:'short',
      day:'numeric',
      hour:'numeric',
      minute:'2-digit'
    }
  )
}

export default async function ChatPage(){
  const supabase=
    await createClient()

  const {data:{user}}=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const [
    {data:profile},
    {data:messages}
  ]=
    await Promise.all([
      supabase
        .from('users')
        .select('role')
        .eq('id',user.id)
        .maybeSingle(),

      supabase
        .from('chat_messages')
        .select(`
          id,
          user_id,
          message,
          is_commissioner,
          is_system,
          is_pinned,
          pinned_at,
          created_at,

          squads(
            squad_name,
            owner_name,
            logo_path,

            nfl_teams(
              name,
              abbreviation
            )
          )
        `)
        .order(
          'is_pinned',
          {ascending:false}
        )
        .order(
          'pinned_at',
          {
            ascending:false,
            nullsFirst:false
          }
        )
        .order(
          'created_at',
          {ascending:false}
        )
        .limit(100)
    ])

  const commissioner=
    profile?.role==='commissioner'

  return (
    <main className="wrap">
      <div className="top">
        <div>
          <div className="big">
            NFL SQUADS
          </div>

          <div className="muted">
            2026 League Chat
          </div>
        </div>
      </div>

      <Nav commissioner={commissioner}/>

      <section className="card">
        <h1>
          League Chat
        </h1>

        <p className="muted">
          Talk league business, talk trash, or post updates.
        </p>

        <form action={postMessage}>
          <textarea
            name="message"
            placeholder="Post a message..."
            maxLength={500}
            required
            rows={3}
            style={{
              width:'100%',
              resize:'vertical'
            }}
          />

          <button
            className="submit"
            type="submit"
          >
            Post Message
          </button>
        </form>
      </section>

      <section className="card">
        <h2>
          Recent Messages
        </h2>

        {!messages?.length ? (
          <p className="muted">
            No messages yet.
          </p>
        ) : (
          messages.map(
            (m:any)=>{
              const squad=
                m.squads

              const author=
                squad?.owner_name ||
                squad?.squad_name ||
                (
                  m.is_commissioner
                    ? 'Commissioner'
                    : 'Owner'
                )

              const isSystem=
                m.is_system===true

              return (
                <div
                  key={m.id}
                  style={{
                    padding:'12px',
                    marginBottom:10,
                    border:
                      m.is_pinned
                        ? '2px solid #999'
                        : isSystem
                          ? '2px solid #bbb'
                          : '1px solid #ddd',
                    borderRadius:8,
                    background:
                      isSystem
                        ? '#f7f7f7'
                        : undefined
                  }}
                >
                  {m.is_pinned && (
                    <div
                      style={{
                        fontWeight:700,
                        marginBottom:6
                      }}
                    >
                      📌 Pinned Announcement
                    </div>
                  )}

                  {isSystem ? (
                    <div>
                      <b>
                        🏈 NFL SQUADS · League Update
                      </b>
                    </div>
                  ) : (
                    <div
                      style={{
                        display:'flex',
                        alignItems:'center',
                        gap:7
                      }}
                    >
                      <SquadLogo
                        logoPath={
                          squad?.logo_path
                        }
                        nflAbbreviation={
                          squad?.nfl_teams
                            ?.abbreviation
                        }
                        squadName={
                          squad?.squad_name
                        }
                        size={30}
                      />

                      <div>
                        <b>
                          {author}
                        </b>

                        {squad?.squad_name &&
                         squad.owner_name ? (
                          <span className="muted">
                            {' '}
                            · {squad.squad_name}
                          </span>
                        ) : null}

                        {m.is_commissioner ? (
                          <span className="muted">
                            {' '}
                            · Commissioner
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop:6,
                      fontWeight:
                        isSystem
                          ? 600
                          : 400
                    }}
                  >
                    {m.message}
                  </div>

                  <div
                    className="muted"
                    style={{
                      marginTop:6,
                      fontSize:'0.9rem'
                    }}
                  >
                    {formatTime(
                      m.created_at
                    )}{' '}
                    ET
                  </div>

                  {commissioner && (
                    <div
                      style={{
                        marginTop:10,
                        display:'flex',
                        gap:8,
                        flexWrap:'wrap'
                      }}
                    >
                      <form
                        action={
                          togglePinMessage
                        }
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={m.id}
                        />

                        <input
                          type="hidden"
                          name="is_pinned"
                          value={
                            String(
                              m.is_pinned
                            )
                          }
                        />

                        <button type="submit">
                          {m.is_pinned
                            ? 'Unpin'
                            : 'Pin'}
                        </button>
                      </form>

                      <form
                        action={
                          deleteMessage
                        }
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={m.id}
                        />

                        <button type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )
            }
          )
        )}
      </section>
    </main>
  )
}