'use client'

import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'

function urlBase64ToUint8Array(value:string){
  const padding='='.repeat((4-value.length%4)%4)
  const raw=window.atob((value+padding).replace(/-/g,'+').replace(/_/g,'/'))
  return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)))
}

export default function AlertsClient(){
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState(false)
  const [remind24,setRemind24]=useState(false)
  const [remind1,setRemind1]=useState(false)
  const [deviceReady,setDeviceReady]=useState(false)
  const [needsHomeScreen,setNeedsHomeScreen]=useState(false)
  const [status,setStatus]=useState('Loading your alert settings…')

  useEffect(()=>{
    let active=true
    async function loadSettings(){
      try{
        const supabase=createClient()
        const {data:{user}}=await supabase.auth.getUser()
        if(!user)throw new Error('Please sign in again.')
        const {data:pref,error}=await supabase.from('nfl_pick_alert_preferences')
          .select('remind_24h,remind_1h').eq('user_id',user.id).maybeSingle()
        if(error)throw error
        if(!active)return
        setRemind24(pref?.remind_24h===true)
        setRemind1(pref?.remind_1h===true)

        const standalone=window.matchMedia('(display-mode: standalone)').matches ||
          Boolean((navigator as Navigator & {standalone?:boolean}).standalone)
        if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!standalone){
          setNeedsHomeScreen(true)
          setStatus('On iPhone, open NFL Squads from its Home Screen icon to enable push alerts.')
          return
        }
        if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
          setStatus('Push alerts are not supported in this browser.')
          return
        }
        const registration=await navigator.serviceWorker.register('/sw.js')
        const subscription=await registration.pushManager.getSubscription()
        if(subscription){
          const {data:stored}=await supabase.from('push_subscriptions')
            .select('nfl_pick_reminders').eq('user_id',user.id)
            .eq('endpoint',subscription.endpoint).maybeSingle()
          if(active)setDeviceReady(stored?.nfl_pick_reminders===true)
        }
        if(active)setStatus('Choose the reminders you want on this device.')
      }catch(error){
        if(active)setStatus(error instanceof Error?error.message:String(error))
      }finally{
        if(active)setLoading(false)
      }
    }
    void loadSettings()
    return ()=>{active=false}
  },[])

  async function enableDevice(){
    const standalone=window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & {standalone?:boolean}).standalone)
    if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!standalone)
      throw new Error('Add NFL Squads to your iPhone Home Screen, then open it from there.')
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))
      throw new Error('Push alerts are not supported in this browser.')

    // Request permission while this button press is still the active user gesture.
    const permission=await Notification.requestPermission()
    if(permission!=='granted')throw new Error('Notification permission was not granted.')

    const supabase=createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)throw new Error('Please sign in again.')
    const registration=await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const {data:config,error:configError}=await supabase.from('push_config')
      .select('vapid_public_key').eq('id',1).single()
    if(configError||!config?.vapid_public_key)throw new Error('Push configuration is unavailable.')
    let subscription=await registration.pushManager.getSubscription()
    if(!subscription){
      subscription=await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(config.vapid_public_key)
      })
    }
    const serialized=subscription.toJSON()
    if(!serialized.keys?.p256dh||!serialized.keys?.auth)
      throw new Error('The device did not return a valid push subscription.')
    const {error}=await supabase.from('push_subscriptions').upsert({
      user_id:user.id,
      endpoint:subscription.endpoint,
      p256dh:serialized.keys.p256dh,
      auth:serialized.keys.auth,
      user_agent:navigator.userAgent,
      nfl_pick_reminders:true,
      updated_at:new Date().toISOString()
    },{onConflict:'endpoint'})
    if(error)throw error
    setDeviceReady(true)
    return user.id
  }

  async function saveReminder(which:'24h'|'1h',enabled:boolean){
    setWorking(true)
    try{
      const supabase=createClient()
      const userId=enabled
        ? await enableDevice()
        : (await supabase.auth.getUser()).data.user?.id
      if(!userId)throw new Error('Please sign in again.')
      const next24=which==='24h'?enabled:remind24
      const next1=which==='1h'?enabled:remind1
      const {error}=await supabase.from('nfl_pick_alert_preferences').upsert({
        user_id:userId,
        remind_24h:next24,
        remind_1h:next1,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'})
      if(error)throw error
      setRemind24(next24)
      setRemind1(next1)
      setStatus(enabled?'Reminder enabled.':'Reminder turned off.')
    }catch(error){
      setStatus(error instanceof Error?error.message:String(error))
    }finally{
      setWorking(false)
    }
  }

  async function activateThisDevice(){
    setWorking(true)
    try{
      await enableDevice()
      setStatus('Push alerts are enabled on this device.')
    }catch(error){
      setStatus(error instanceof Error?error.message:String(error))
    }finally{
      setWorking(false)
    }
  }

  return <div>
    <div style={{display:'grid',gap:12}}>
      <label style={{display:'flex',alignItems:'center',gap:12,padding:16,border:'1px solid #ddd',borderRadius:12,cursor:'pointer'}}>
        <input type="checkbox" checked={remind24} disabled={loading||working||needsHomeScreen}
          onChange={event=>void saveReminder('24h',event.target.checked)}
          style={{width:22,height:22,flexShrink:0}}/>
        <span><strong>24 hours before kickoff</strong><br/>
          <span className="muted">Alert me if I still have no pick.</span></span>
      </label>
      <label style={{display:'flex',alignItems:'center',gap:12,padding:16,border:'1px solid #ddd',borderRadius:12,cursor:'pointer'}}>
        <input type="checkbox" checked={remind1} disabled={loading||working||needsHomeScreen}
          onChange={event=>void saveReminder('1h',event.target.checked)}
          style={{width:22,height:22,flexShrink:0}}/>
        <span><strong>One hour before kickoff</strong><br/>
          <span className="muted">Alert me if I still have no pick.</span></span>
      </label>
    </div>
    <p role="status" style={{marginTop:16}}>{status}</p>
    {!needsHomeScreen&&!deviceReady&&(remind24||remind1)&&
      <button type="button" disabled={working||loading} onClick={()=>void activateThisDevice()}
        style={{padding:'12px 16px',borderRadius:10,cursor:'pointer'}}>
        Enable alerts on this device
      </button>}
    {needsHomeScreen&&<div style={{lineHeight:1.6}}>
      In Safari, tap Share, then Add to Home Screen. Open NFL Squads from that icon,
      return to Stuff → Alerts, and turn on your reminders.
    </div>}
    <p className="muted" style={{fontSize:'0.85rem',marginBottom:0}}>
      Reminders require notification permission on your device. A submitted pick
      cancels the reminder. Bye weeks have no pick reminder.
    </p>
  </div>
}
