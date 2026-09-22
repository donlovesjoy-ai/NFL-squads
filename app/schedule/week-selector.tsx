'use client'

import { useRouter } from 'next/navigation'

export default function WeekSelector({week}:{week:number}){
  const router=useRouter()

  return (
    <div
      style={{
        width:180,
        maxWidth:'100%',
        margin:'0 auto 18px'
      }}
    >
      <select
        aria-label="Select NFL week"
        value={week}
        onChange={(event)=>router.push(`/schedule?week=${event.target.value}`)}
        style={{
          width:'100%',
          margin:0,
          padding:'10px 36px 10px 12px',
          border:'1px solid #bbb',
          borderRadius:10,
          background:'#fff',
          color:'#111',
          fontSize:'1.5rem',
          fontWeight:400,
          textAlign:'center',
          textAlignLast:'center',
          cursor:'pointer'
        }}
      >
        {Array.from({length:18},(_,index)=>index+1).map(optionWeek=>(
          <option key={optionWeek} value={optionWeek}>
            Week {optionWeek}
          </option>
        ))}
      </select>
    </div>
  )
}
