'use client'

import { useEffect } from 'react'
import { recordAuthenticatedVisit } from '../activity/actions'

const STORAGE_KEY='nfl-squads:last-recorded-visit-hour'

export default function ActivityTracker(){
  useEffect(()=>{
    const currentHour=new Date().toISOString().slice(0,13)

    try{
      if(window.localStorage.getItem(STORAGE_KEY)===currentHour){
        return
      }
    }catch{}

    void recordAuthenticatedVisit()
      .then(recorded=>{
        if(!recorded) return

        try{
          window.localStorage.setItem(STORAGE_KEY,currentHour)
        }catch{}
      })
      .catch(error=>{
        console.error('[activity] Visit tracking request failed',error)
      })
  },[])

  return null
}
