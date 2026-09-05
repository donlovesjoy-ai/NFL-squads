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
              minWidth:38,
              padding:'3px 7px',
              borderRadius:8,
              border:'1px solid #d8d8d8',
              background:reaction.reactedByMe ? '#f3f3f3' : '#fff',
              color:'#111',
              cursor:canReact ? 'pointer' : 'default',
              fontSize:'0.88rem',
              fontWeight:700
            }}
          >
            <span>{reaction.emoji}</span>
            <span style={{marginLeft:4,color:'#111'}}>{reaction.count}</span>
          </button>
        </form>
      ))}

      {canReact && (
        <>
          <button
            type="button"
            onClick={()=>setShowPicker(value=>!value)}
            aria-label="Add reaction"
            title="Add reaction"
            style={{
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
        </>
      )}
    </div>
  )
}
