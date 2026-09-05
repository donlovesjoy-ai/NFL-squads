'use client'

import { useEffect,useState } from 'react'
import SquadLogo from '../components/SquadLogo'
import { createClient } from '@/lib/supabase/client'
import { toggleReaction } from './actions'

type Reaction={
  emoji:string
  count:number
  reactedByMe:boolean
}

type ReactorLogo={
  userId:string
  squadName:string|null
  logoPath:string|null
  nflAbbreviation:string|null
}

type Props={
  messageId:number
  reactions:Reaction[]
  canReact:boolean
}

const reactionChoices=[
  '👍','👎','❤️','😂','🔥','👏','🏈','🍺','💯','😮'
]

export default function MessageReactions({
  messageId,
  reactions,
  canReact
}:Props){
  const [showPicker,setShowPicker]=useState(false)
  const [reactorsByEmoji,setReactorsByEmoji]=useState<Record<string,ReactorLogo[]>>({})

  const reactionSignature=reactions
    .map(reaction=>`${reaction.emoji}:${reaction.count}:${reaction.reactedByMe}`)
    .join('|')

  useEffect(()=>{
    let active=true

    async function loadReactors(){
      const supabase=createClient()

      const {data:reactionRows}=await supabase
        .from('chat_message_reactions')
        .select('user_id,emoji')
        .eq('message_id',messageId)

      if(!active){
        return
      }

      const rows=reactionRows||[]
      const userIds=[
        ...new Set(
          rows
            .map((row:any)=>String(row.user_id||''))
            .filter(Boolean)
        )
      ]

      if(!userIds.length){
        setReactorsByEmoji({})
        return
      }

      const {data:squads}=await supabase
        .from('squads')
        .select(`
          user_id,
          squad_name,
          logo_path,
          nfl_teams(
            abbreviation
          )
        `)
        .eq('season_year',2026)
        .in('user_id',userIds)

      if(!active){
        return
      }

      const squadByUser=new Map<string,any>()

      for(const squad of squads||[]){
        if(squad.user_id){
          squadByUser.set(String(squad.user_id),squad)
        }
      }

      const grouped:Record<string,ReactorLogo[]>={}

      for(const row of rows as any[]){
        const userId=String(row.user_id||'')
        const emoji=String(row.emoji||'')
        const squad=squadByUser.get(userId)

        if(!userId || !emoji || !squad){
          continue
        }

        const nflTeam=Array.isArray(squad.nfl_teams)
          ? squad.nfl_teams[0]
          : squad.nfl_teams

        const reactor:ReactorLogo={
          userId,
          squadName:squad.squad_name||null,
          logoPath:squad.logo_path||null,
          nflAbbreviation:nflTeam?.abbreviation||null
        }

        if(!grouped[emoji]){
          grouped[emoji]=[]
        }

        grouped[emoji].push(reactor)
      }

      setReactorsByEmoji(grouped)
    }

    loadReactors()

    return ()=>{
      active=false
    }
  },[messageId,reactionSignature])

  return (
    <div
      style={{
        marginTop:8,
        width:'100%'
      }}
    >
      <div
        style={{
          display:'flex',
          alignItems:'center',
          gap:6,
          width:'100%'
        }}
      >
        <div
          style={{
            display:'flex',
            alignItems:'center',
            gap:6,
            flexWrap:'wrap',
            minWidth:0
          }}
        >
          {reactions.map(reaction=>{
            const reactors=reactorsByEmoji[reaction.emoji]||[]

            return (
              <form
                key={reaction.emoji}
                action={toggleReaction}
                style={{margin:0}}
              >
                <input type="hidden" name="message_id" value={messageId}/>
                <input type="hidden" name="emoji" value={reaction.emoji}/>
                <button
                  type="submit"
                  disabled={!canReact}
                  aria-label={`${reaction.emoji} reaction, ${reaction.count}`}
                  style={{
                    minWidth:38,
                    padding:'3px 7px',
                    borderRadius:8,
                    border:'1px solid #d8d8d8',
                    background:reaction.reactedByMe ? '#f3f3f3' : '#fff',
                    color:'#111',
                    cursor:canReact ? 'pointer' : 'default',
                    fontSize:'0.88rem',
                    fontWeight:700,
                    display:'inline-flex',
                    alignItems:'center',
                    gap:4
                  }}
                >
                  <span>{reaction.emoji}</span>

                  {reactors.map((reactor,index)=>(
                    <span
                      key={reactor.userId}
                      title={reactor.squadName||undefined}
                      style={{
                        display:'inline-flex',
                        marginLeft:index===0 ? 1 : -3
                      }}
                    >
                      <SquadLogo
                        logoPath={reactor.logoPath}
                        nflAbbreviation={reactor.nflAbbreviation}
                        squadName={reactor.squadName}
                        size={18}
                      />
                    </span>
                  ))}
                </button>
              </form>
            )
          })}
        </div>

        {canReact && (
          <button
            type="button"
            onClick={()=>setShowPicker(value=>!value)}
            aria-label="Add reaction"
            title="Add reaction"
            style={{
              marginLeft:'auto',
              flexShrink:0,
              padding:'3px 7px',
              borderRadius:8,
              border:'1px solid #d8d8d8',
              background:'#fff',
              color:'#111',
              fontSize:'1rem',
              lineHeight:1.2,
              cursor:'pointer'
            }}
          >
            🙂+
          </button>
        )}
      </div>

      {canReact && showPicker && (
        <div
          style={{
            display:'flex',
            gap:4,
            flexWrap:'wrap',
            width:'100%',
            marginTop:6
          }}
        >
          {reactionChoices.map(emoji=>(
            <form
              key={emoji}
              action={toggleReaction}
              style={{margin:0}}
            >
              <input type="hidden" name="message_id" value={messageId}/>
              <input type="hidden" name="emoji" value={emoji}/>
              <button
                type="submit"
                aria-label={`React with ${emoji}`}
                style={{
                  border:'1px solid #ddd',
                  background:'#fff',
                  color:'#111',
                  borderRadius:8,
                  padding:'5px 7px',
                  fontSize:'1.15rem',
                  cursor:'pointer'
                }}
              >
                {emoji}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  )
}
