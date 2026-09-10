'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LiveRefresh({enabled}:{enabled:boolean}){
  const router=useRouter()

  useEffect(()=>{
    if(!enabled) return

    const interval=window.setInterval(()=>{
      router.refresh()
    },15000)

    return ()=>window.clearInterval(interval)
  },[enabled,router])

  return null
}
