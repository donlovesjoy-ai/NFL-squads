'use client'

import { useState } from 'react'
import { toggleReaction } from './actions'

type Reaction={
  emoji:string
  count:number
  reactedByMe:boolean
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

  return (
    <div
      style={{
        marginTop:8,
        display:'flex',
        alignItems:'center',
        gap:6,
        flexWrap:'wrap'
      }}
    >
      {reactions.map(reaction=>(
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
              minWidth:42,
              padding:'4px 8px',
              borderRadius:999,
              border:reaction.reactedByMe
                ? '2px solid #111'
                : '1px solid #ccc',
              background:reaction.reactedByMe
                ? '#f2f2f2'
                : '#fff',
              cursor:canReact ? 'pointer' : 'default',
              fontSize:'0.88rem'
            }}
          >
            {reaction.emoji} {reaction.count}
          </button>
        </form>
      ))}

      {canReact && (
        <>
          <button
            type="button"
            onClick={()=>setShowPicker(value=>!value)}
            style={{
              padding:'4px 9px',
              borderRadius:999,
              border:'1px solid #ccc',
              background:'#fff',
              fontSize:'0.82rem',
              fontWeight:700,
              cursor:'pointer'
            }}
          >
            + React
          </button>

          {showPicker && (
            <div
              style={{
                display:'flex',
                gap:4,
                flexWrap:'wrap',
                width:'100%',
                marginTop:2
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
        </>
      )}
    </div>
  )
}
