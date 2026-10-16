'use client'

import {useEffect} from 'react'
import {useRouter} from 'next/navigation'

export default function RefreshOnResume(){
  const router=useRouter()

  useEffect(()=>{
    let lastRefresh=Date.now()

    const refreshIfVisible=()=>{
      if(document.visibilityState!=='visible') return
      const now=Date.now()
      if(now-lastRefresh<3000) return
      lastRefresh=now
      router.refresh()
    }

    const onPageShow=(event:PageTransitionEvent)=>{
      if(event.persisted) refreshIfVisible()
    }

    document.addEventListener('visibilitychange',refreshIfVisible)
    window.addEventListener('focus',refreshIfVisible)
    window.addEventListener('pageshow',onPageShow)

    return ()=>{
      document.removeEventListener('visibilitychange',refreshIfVisible)
      window.removeEventListener('focus',refreshIfVisible)
      window.removeEventListener('pageshow',onPageShow)
    }
  },[router])

  return null
}
