import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {Nav} from '../../components'
import AlertsClient from './AlertsClient'

export default async function AlertsPage(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')
  const {data:profile}=await supabase.from('users')
    .select('role').eq('id',user.id).maybeSingle()

  return <main className="wrap">
    <Nav commissioner={profile?.role==='commissioner'}/>
    <h1 style={{textAlign:'center'}}>Alerts</h1>
    <section className="card" style={{maxWidth:720,margin:'0 auto'}}>
      <p style={{marginTop:0}}>Receive a reminder if you have not made a decision for your next game.</p>
      <AlertsClient/>
      <p style={{marginBottom:0,marginTop:24}}><Link href="/stuff">Back to Stuff</Link></p>
    </section>
  </main>
}
