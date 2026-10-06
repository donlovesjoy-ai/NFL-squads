 'use client'

import {
  ReactNode,
  useEffect,
  useRef
} from 'react'

export default function ChatScroller({
  children
}:{
  children:ReactNode
}){
  const scrollRef=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const scrollToBottom=()=>{
      const element=scrollRef.current
      if(element) element.scrollTop=element.scrollHeight
    }

    requestAnimationFrame(()=>{
      requestAnimationFrame(
        scrollToBottom
      )
    })
  },[])

  return (
    <div className="chat-message-scroll" ref={scrollRef}>
      {children}
    </div>
  )
}