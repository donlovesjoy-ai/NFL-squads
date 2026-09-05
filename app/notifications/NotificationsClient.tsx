'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String:string){
  const padding='='.repeat((4-(base64String.length%4))%4)
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/')
  const rawData=window.atob(base64)
  return Uint8Array.from([...rawData].map(char=>char.charCodeAt(0)))
}

export default function NotificationsClient(){
  const [status,setStatus]=useState('Checking notification support…')
  const [working,setWorking]=useState(false)
  const [enabled,setEnabled]=useState(false)
  const [needsHomeScreen,setNeedsHomeScreen]=useState(false)

  useEffect(()=>{
    const standalone=window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & {standalone?:boolean}).standalone)
    const isiPhone=/iPhone|iPad|iPod/i.test(navigator.userAgent)
    if(isiPhone&&!standalone){
      setNeedsHomeScreen(true)
      setStatus('On iPhone, add NFL Squads to your Home Screen first, then open it from the new Home Screen icon.')
      return
    }
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
      setStatus('Push notifications are not supported in this browser.')
      return
    }
    navigator.serviceWorker.register('/sw.js').then(async registration=>{
      const subscription=await registration.pushManager.getSubscription()
      if(subscription){
        setEnabled(true)
        setStatus('Scoring alerts are enabled on this device.')
      }else{
        setStatus('Scoring alerts are ready to enable.')
      }
    }).catch(()=>setStatus('Could not prepare push notifications on this device.'))
  },[])

  async function enableNotifications(){
    setWorking(true)
    try{
      const supabase=createClient()
      const {data:{user}}=await supabase.auth.getUser()
      if(!user) throw new Error('Please sign in to NFL Squads first.')

      const permission=await Notification.requestPermission()
      if(permission!=='granted') throw new Error('Notification permission was not granted.')

      const registration=await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const {data:config,error:configError}=await supabase
        .from('push_config')
        .select('vapid_public_key')
        .eq('id',1)
        .single()
      if(configError||!config?.vapid_public_key) throw new Error('Push configuration is unavailable.')

      let subscription=await registration.pushManager.getSubscription()
      if(!subscription){
        subscription=await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(config.vapid_public_key)
        })
      }

      const serialized=subscription.toJSON()
      const p256dh=serialized.keys?.p256dh
      const auth=serialized.keys?.auth
      if(!p256dh||!auth) throw new Error('The browser did not return a valid push subscription.')

      const {error}=await supabase.from('push_subscriptions').upsert({
        user_id:user.id,
        endpoint:subscription.endpoint,
        p256dh,
        auth,
        user_agent:navigator.userAgent,
        updated_at:new Date().toISOString()
      },{onConflict:'endpoint'})
      if(error) throw error

      setEnabled(true)
      setStatus('Scoring alerts are enabled. You will be notified if the ESPN score feed stays down long enough to trigger an outage, and again when it recovers.')
    }catch(error){
      setStatus(error instanceof Error?error.message:String(error))
    }finally{
      setWorking(false)
    }
  }

  return <main style={{maxWidth:680,margin:'0 auto',padding:'28px 18px',fontFamily:'Arial, sans-serif'}}>
    <h1 style={{marginBottom:8}}>Scoring alerts</h1>
    <p style={{lineHeight:1.5,marginTop:0}}>{status}</p>

    {needsHomeScreen&&<div style={{border:'1px solid #ddd',borderRadius:12,padding:16,margin:'18px 0'}}>
      <strong>iPhone setup</strong>
      <ol style={{lineHeight:1.7,paddingLeft:22}}>
        <li>In Safari, tap the Share button.</li>
        <li>Tap <b>Add to Home Screen</b>.</li>
        <li>Tap <b>Add</b>.</li>
        <li>Open NFL Squads from the new Home Screen icon.</li>
        <li>Return to this Scoring alerts page and enable notifications.</li>
      </ol>
    </div>}

    {!needsHomeScreen&&<button
      type="button"
      onClick={enableNotifications}
      disabled={working||enabled}
      style={{padding:'12px 18px',borderRadius:10,border:'1px solid #222',fontWeight:700,cursor:working||enabled?'default':'pointer'}}
    >{enabled?'Alerts enabled':working?'Enabling…':'Enable scoring alerts'}</button>}

    <p style={{lineHeight:1.5,marginTop:22,fontSize:14}}>
      NFL alerts trigger after roughly 6 minutes without a successful live-score poll. OPP college alerts trigger after roughly 15 minutes. One recovery notification is sent when scoring resumes.
    </p>

    <p style={{marginTop:24}}><Link href="/dashboard">Back to dashboard</Link></p>
  </main>
}
