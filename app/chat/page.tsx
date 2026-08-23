 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import { postMessage } from './actions'

function formatTime(value:string){
  return new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',
    month:'short',
    day:'numeric',
    hour:'numeric',
    minute:'2-digit'
  })
}

export default async function ChatPage(){
  const supabase=await createClient()

  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const [{data:profile},{data:messages}] = await Promise.all([
    supabase.from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle(),

    supabase.from('chat_messages')
      .select(`
        id,
        user_id,
        message,
        is_commissioner,
        created_at,
        squads(
          squad_name,
          owner_name,
          nfl_teams(name,abbreviation)
        )
      `)
      .order('created_at',{ascending:false})
      .limit(100)
  ])

  const commissioner=profile?.role==='commissioner'

  return <main className="wrap">
    <div className="top">
      <div>
        <div className="big">NFL SQUADS</div>
        <div className="muted">2026 League Chat</div>
      </div>
    </div>

    <Nav commissioner={commissioner}/>

    <section className="card">
      <h1>League Chat</h1>
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
          style={{width:'100%',resize:'vertical'}}
        />

        <button className="submit" type="submit">
          Post Message
        </button>
      </form>
    </section>

    <section className="card">
      <h2>Recent Messages</h2>

      {!messages?.length
        ? <p className="muted">No messages yet.</p>
        : messages.map((m:any)=>{
            const squad=m.squads
            const author =
              squad?.owner_name ||
              squad?.squad_name ||
              (m.is_commissioner ? 'Commissioner' : 'Owner')

            return <div
              key={m.id}
              style={{
                padding:'12px 0',
                borderBottom:'1px solid #ddd'
              }}
            >
              <div>
                <b>{author}</b>
                {squad?.squad_name && squad.owner_name
                  ? <span className="muted"> · {squad.squad_name}</span>
                  : null}
                {m.is_commissioner
                  ? <span className="muted"> · Commissioner</span>
                  : null}
              </div>

              <div style={{marginTop:6}}>
                {m.message}
              </div>

              <div className="muted" style={{marginTop:6,fontSize:'0.9rem'}}>
                {formatTime(m.created_at)} ET
              </div>
            </div>
          })
      }
    </section>
  </main>
}