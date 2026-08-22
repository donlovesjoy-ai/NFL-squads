'use client'

import { useRouter } from 'next/navigation'

export default function WeekSelector({week}:{week:number}){
  const router=useRouter()
  return <label style={{display:'block',maxWidth:280}}>
    <b>Week</b>
    <select
      value={week}
      onChange={(e)=>router.push(`/schedule?week=${e.target.value}`)}
      style={{marginTop:8}}
    >
      {Array.from({length:18},(_,i)=>i+1).map(w=>
        <option key={w} value={w}>Week {w}</option>
      )}
    </select>
  </label>
}
