 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'
import ChatScroller from './ChatScroller'
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
    {data:messageData}
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
          'created_at',
          {ascending:false}
        )
        .limit(100)
    ])

  const commissioner=
    profile?.role==='commissioner'

  /*
    Retrieve the newest 100 messages from
    Supabase, then reverse them so the
    conversation reads oldest at the top
    and newest at the bottom.
  */
  const messages=
    messageData
      ? [...messageData].reverse()
      : []

  return (
    <main
      className="wrap"
      style={{
        paddingBottom:
          'calc(150px + env(safe-area-inset-bottom))'
      }}
    >
      <div
        className="top"
        style={{
          justifyContent:'center',
          textAlign:'center'
        }}
      >
        <div
          style={{
            width:'100%',
            textAlign:'center'
          }}
        >
          <div className="big">
            NFL SQUADS
          </div>

          <div className="muted">
            2026 League Chat
          </div>
        </div>
      </div>

      <Nav commissioner={commissioner}/>

      <ChatScroller>
        <section
          style={{
            marginTop:16
          }}
        >
          {!messages.length ? (
            <div
              style={{
                textAlign:'center',
                padding:'40px 12px'
              }}
            >
              <p className="muted">
                No messages yet.
              </p>
            </div>
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
                      borderRadius:10,
                      background:
                        isSystem
                          ? '#f7f7f7'
                          : '#fff'
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
                            squad
                              ?.nfl_teams
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
                            : 400,
                        whiteSpace:'pre-wrap',
                        overflowWrap:'anywhere'
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

                          <button
                            type="submit"
                          >
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

                          <button
                            type="submit"
                          >
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

          <div
            id="chat-bottom"
            style={{
              height:1
            }}
          />
        </section>
      </ChatScroller>

      <div
        style={{
          position:'fixed',
          left:0,
          right:0,
          bottom:0,
          zIndex:100,
          background:'#fff',
          borderTop:'1px solid #d5d5d5',
          boxShadow:
            '0 -4px 14px rgba(0,0,0,0.08)',
          padding:
            '10px 12px calc(10px + env(safe-area-inset-bottom))'
        }}
      >
        <div
          style={{
            width:'100%',
            maxWidth:900,
            margin:'0 auto'
          }}
        >
          <form
            action={postMessage}
            style={{
              display:'grid',
              gridTemplateColumns:
                'minmax(0,1fr) auto',
              gap:8,
              alignItems:'end'
            }}
          >
            <textarea
              name="message"
              placeholder="Write a message..."
              maxLength={500}
              required
              rows={2}
              style={{
                width:'100%',
                minWidth:0,
                resize:'none',
                margin:0,
                borderRadius:10
              }}
            />

            <button
              className="submit"
              type="submit"
              style={{
                margin:0,
                whiteSpace:'nowrap',
                minHeight:48
              }}
            >
              Got something to say?
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}