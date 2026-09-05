import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'
import ChatScroller from './ChatScroller'
import ChatComposer from './ChatComposer'
import {
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

function authorFor(message:any){
  const squad=message?.squads
  return (
    squad?.owner_name ||
    squad?.squad_name ||
    (message?.is_commissioner ? 'Commissioner' : 'Owner')
  )
}

export default async function ChatPage({
  searchParams
}:{
  searchParams:Promise<{reply?:string}>
}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const [
    {data:profile},
    {data:messageData}
  ]=await Promise.all([
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
        reply_to_id,
        image_path,
        gif_url,
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
      .order('created_at',{ascending:false})
      .limit(150)
  ])

  const commissioner=profile?.role==='commissioner'
  const messages=messageData ? [...messageData].reverse() : []
  const messageById=new Map<number,any>()

  for(const message of messages){
    messageById.set(Number(message.id),message)
  }

  const requestedReplyId=Number(sp.reply)
  let replyTarget=Number.isInteger(requestedReplyId) && requestedReplyId>0
    ? messageById.get(requestedReplyId) || null
    : null

  if(!replyTarget && Number.isInteger(requestedReplyId) && requestedReplyId>0){
    const {data}=await supabase
      .from('chat_messages')
      .select(`
        id,
        message,
        is_commissioner,
        squads(
          squad_name,
          owner_name
        )
      `)
      .eq('id',requestedReplyId)
      .maybeSingle()

    replyTarget=data||null
  }

  const replyInfo=replyTarget
    ? {
        id:Number(replyTarget.id),
        author:authorFor(replyTarget),
        message:String(replyTarget.message||'')
      }
    : null

  return (
    <main
      className="wrap"
      style={{
        paddingBottom:'calc(300px + env(safe-area-inset-bottom))'
      }}
    >
      <div
        className="top"
        style={{
          justifyContent:'center',
          textAlign:'center'
        }}
      >
        <div style={{width:'100%',textAlign:'center'}}>
          <div className="big">NFL SQUADS</div>
          <div className="muted">2026 League Chat</div>
        </div>
      </div>

      <Nav commissioner={commissioner}/>

      <ChatScroller>
        <section style={{marginTop:16}}>
          {!messages.length ? (
            <div style={{textAlign:'center',padding:'40px 12px'}}>
              <p className="muted">No messages yet.</p>
            </div>
          ) : (
            messages.map((m:any)=>{
              const squad=m.squads
              const author=authorFor(m)
              const isSystem=m.is_system===true
              const repliedTo=m.reply_to_id
                ? messageById.get(Number(m.reply_to_id))
                : null

              const imageUrl=m.image_path
                ? supabase.storage
                    .from('chat-media')
                    .getPublicUrl(m.image_path)
                    .data.publicUrl
                : null

              return (
                <div
                  key={m.id}
                  style={{
                    padding:'12px',
                    marginBottom:10,
                    marginLeft:m.reply_to_id ? 20 : 0,
                    border:m.is_pinned
                      ? '2px solid #999'
                      : isSystem
                        ? '2px solid #bbb'
                        : '1px solid #ddd',
                    borderLeft:m.reply_to_id
                      ? '4px solid #999'
                      : undefined,
                    borderRadius:10,
                    background:isSystem ? '#f7f7f7' : '#fff'
                  }}
                >
                  {m.is_pinned && (
                    <div style={{fontWeight:700,marginBottom:6}}>
                      📌 Pinned Announcement
                    </div>
                  )}

                  {repliedTo && (
                    <div
                      style={{
                        marginBottom:8,
                        padding:'7px 9px',
                        background:'#f3f3f3',
                        borderRadius:8,
                        fontSize:'0.8rem'
                      }}
                    >
                      <div style={{fontWeight:800}}>
                        Reply to {authorFor(repliedTo)}
                      </div>
                      <div
                        className="muted"
                        style={{
                          overflow:'hidden',
                          textOverflow:'ellipsis',
                          whiteSpace:'nowrap'
                        }}
                      >
                        {repliedTo.message || 'Photo / GIF'}
                      </div>
                    </div>
                  )}

                  {m.reply_to_id && !repliedTo && (
                    <div
                      className="muted"
                      style={{fontSize:'0.78rem',marginBottom:8}}
                    >
                      Reply to an earlier message
                    </div>
                  )}

                  {isSystem ? (
                    <div>
                      <b>🏈 NFL SQUADS · League Update</b>
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <SquadLogo
                        logoPath={squad?.logo_path}
                        nflAbbreviation={squad?.nfl_teams?.abbreviation}
                        squadName={squad?.squad_name}
                        size={30}
                      />

                      <div>
                        <b>{author}</b>

                        {squad?.squad_name && squad.owner_name ? (
                          <span className="muted">
                            {' '}· {squad.squad_name}
                          </span>
                        ) : null}

                        {m.is_commissioner ? (
                          <span className="muted">
                            {' '}· Commissioner
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {m.message ? (
                    <div
                      style={{
                        marginTop:6,
                        fontWeight:isSystem ? 600 : 400,
                        whiteSpace:'pre-wrap',
                        overflowWrap:'anywhere'
                      }}
                    >
                      {m.message}
                    </div>
                  ) : null}

                  {imageUrl && (
                    <div style={{marginTop:8}}>
                      <img
                        src={imageUrl}
                        alt="Chat attachment"
                        style={{
                          display:'block',
                          width:'100%',
                          maxWidth:420,
                          maxHeight:420,
                          objectFit:'contain',
                          borderRadius:10
                        }}
                      />
                    </div>
                  )}

                  {m.gif_url && (
                    <div style={{marginTop:8}}>
                      <img
                        src={m.gif_url}
                        alt="GIF"
                        style={{
                          display:'block',
                          width:'100%',
                          maxWidth:420,
                          maxHeight:420,
                          objectFit:'contain',
                          borderRadius:10
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      marginTop:8,
                      display:'flex',
                      alignItems:'center',
                      gap:10,
                      flexWrap:'wrap'
                    }}
                  >
                    <div
                      className="muted"
                      style={{fontSize:'0.9rem'}}
                    >
                      {formatTime(m.created_at)} ET
                    </div>

                    {!isSystem && (
                      <Link
                        href={`/chat?reply=${m.id}#composer`}
                        style={{
                          fontSize:'0.82rem',
                          fontWeight:800,
                          textDecoration:'underline'
                        }}
                      >
                        Reply
                      </Link>
                    )}
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
                      <form action={togglePinMessage}>
                        <input type="hidden" name="id" value={m.id}/>
                        <input
                          type="hidden"
                          name="is_pinned"
                          value={String(m.is_pinned)}
                        />
                        <button type="submit">
                          {m.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                      </form>

                      <form action={deleteMessage}>
                        <input type="hidden" name="id" value={m.id}/>
                        <button type="submit">Delete</button>
                      </form>
                    </div>
                  )}
                </div>
              )
            })
          )}

          <div id="chat-bottom" style={{height:1}}/>
        </section>
      </ChatScroller>

      <ChatComposer reply={replyInfo}/>
    </main>
  )
}
