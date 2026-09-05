'use client'

import Link from 'next/link'
import { useRef,useState } from 'react'
import { postMessage } from './actions'

const emojis=['😀','😂','🤣','😍','😎','🤔','🙄','😬','🔥','💯','👍','👎','👏','🏈','🍺','🎉']

type ReplyInfo={
  id:number
  author:string
  message:string
}|null

export default function ChatComposer({reply}: {reply:ReplyInfo}){
  const [message,setMessage]=useState('')
  const [showEmoji,setShowEmoji]=useState(false)
  const [showGif,setShowGif]=useState(false)
  const textareaRef=useRef<HTMLTextAreaElement|null>(null)

  function addEmoji(emoji:string){
    setMessage(current=>`${current}${emoji}`)
    setShowEmoji(false)
    requestAnimationFrame(()=>textareaRef.current?.focus())
  }

  return (
    <div
      id="composer"
      style={{
        position:'fixed',
        left:0,
        right:0,
        bottom:0,
        zIndex:100,
        background:'#fff',
        borderTop:'1px solid #d5d5d5',
        boxShadow:'0 -4px 14px rgba(0,0,0,0.08)',
        padding:'10px 12px calc(10px + env(safe-area-inset-bottom))'
      }}
    >
      <div style={{width:'100%',maxWidth:900,margin:'0 auto'}}>
        {reply && (
          <div
            style={{
              maxWidth:700,
              margin:'0 auto 8px',
              padding:'8px 10px',
              borderLeft:'3px solid #777',
              background:'#f4f4f4',
              borderRadius:8,
              fontSize:'0.8rem'
            }}
          >
            <div style={{fontWeight:800}}>
              Replying to {reply.author}
            </div>
            <div
              className="muted"
              style={{
                overflow:'hidden',
                textOverflow:'ellipsis',
                whiteSpace:'nowrap'
              }}
            >
              {reply.message || 'Photo / GIF'}
            </div>
            <Link
              href="/chat#composer"
              style={{
                display:'inline-block',
                marginTop:4,
                textDecoration:'underline'
              }}
            >
              Cancel reply
            </Link>
          </div>
        )}

        <form
          action={postMessage}
          encType="multipart/form-data"
          style={{
            display:'flex',
            flexDirection:'column',
            alignItems:'center',
            gap:8
          }}
        >
          {reply && (
            <input type="hidden" name="reply_to_id" value={reply.id}/>
          )}

          <textarea
            ref={textareaRef}
            name="message"
            placeholder="Write a message..."
            maxLength={500}
            rows={2}
            value={message}
            onChange={event=>setMessage(event.target.value)}
            style={{
              width:'100%',
              maxWidth:700,
              resize:'none',
              margin:0,
              borderRadius:10,
              fontSize:'16px'
            }}
          />

          <div
            style={{
              width:'100%',
              maxWidth:700,
              display:'flex',
              justifyContent:'center',
              gap:8,
              flexWrap:'wrap'
            }}
          >
            <button
              type="button"
              onClick={()=>setShowEmoji(value=>!value)}
              style={{padding:'8px 12px'}}
            >
              😀 Emoji
            </button>

            <label
              style={{
                margin:0,
                padding:'8px 12px',
                border:'1px solid #bbb',
                borderRadius:8,
                fontWeight:700,
                cursor:'pointer',
                background:'#fff'
              }}
            >
              📷 Photo
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{display:'none'}}
              />
            </label>

            <button
              type="button"
              onClick={()=>setShowGif(value=>!value)}
              style={{padding:'8px 12px'}}
            >
              GIF
            </button>
          </div>

          {showEmoji && (
            <div
              style={{
                width:'100%',
                maxWidth:700,
                display:'grid',
                gridTemplateColumns:'repeat(8,1fr)',
                gap:4,
                padding:8,
                border:'1px solid #ddd',
                borderRadius:10,
                background:'#fafafa'
              }}
            >
              {emojis.map(emoji=>(
                <button
                  key={emoji}
                  type="button"
                  onClick={()=>addEmoji(emoji)}
                  style={{
                    border:0,
                    background:'transparent',
                    fontSize:'1.35rem',
                    padding:5,
                    cursor:'pointer'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {showGif && (
            <input
              type="url"
              name="gif_url"
              placeholder="Paste a GIF link"
              inputMode="url"
              style={{
                width:'100%',
                maxWidth:700,
                padding:10,
                border:'1px solid #bbb',
                borderRadius:9,
                fontSize:'16px'
              }}
            />
          )}

          <button
            className="submit"
            type="submit"
            style={{
              margin:0,
              minHeight:44,
              width:'100%',
              maxWidth:300,
              textAlign:'center'
            }}
          >
            Say it
          </button>
        </form>
      </div>
    </div>
  )
}