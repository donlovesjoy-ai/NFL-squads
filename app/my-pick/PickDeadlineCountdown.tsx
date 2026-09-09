'use client'

import { useEffect, useState } from 'react'

function formatRemaining(milliseconds:number){
  const totalSeconds=Math.max(0,Math.ceil(milliseconds/1000))
  const hours=Math.floor(totalSeconds/3600)
  const minutes=Math.floor((totalSeconds%3600)/60)
  const seconds=totalSeconds%60

  return `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
}

export default function PickDeadlineCountdown({
  kickoffTime,
  lockTime
}:{
  kickoffTime:string
  lockTime:string
}){
  const [now,setNow]=useState(()=>Date.now())

  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),250)
    return ()=>window.clearInterval(timer)
  },[])

  const kickoff=new Date(kickoffTime).getTime()
  const lock=new Date(lockTime).getTime()
  const twentyFourHoursBefore=kickoff-(24*60*60*1000)

  if(now<twentyFourHoursBefore || now>=lock){
    return null
  }

  return (
    <div
      aria-live="polite"
      style={{
        marginBottom:8,
        fontSize:'0.9rem',
        fontWeight:800,
        fontVariantNumeric:'tabular-nums'
      }}
    >
      Pick window closes in {formatRemaining(lock-now)}
    </div>
  )
}
