 'use client'

import {
  ReactNode,
  useEffect
} from 'react'

export default function ChatScroller({
  children
}:{
  children:ReactNode
}){
  useEffect(()=>{
    const scrollToBottom=()=>{
      window.scrollTo({
        top:document.documentElement.scrollHeight,
        behavior:'auto'
      })
    }

    requestAnimationFrame(()=>{
      requestAnimationFrame(
        scrollToBottom
      )
    })
  },[])

  return (
    <>
      {children}
    </>
  )
}