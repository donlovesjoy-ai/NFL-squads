import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {Nav} from '../components'

export default async function StuffPage(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')
  const {data:profile}=await supabase.from('users')
    .select('role').eq('id',user.id).maybeSingle()

  return <main className="wrap">
    <Nav commissioner={profile?.role==='commissioner'}/>
    <h1 style={{textAlign:'center'}}>Stuff</h1>
    <section className="card" style={{maxWidth:720,margin:'0 auto'}}>
      <div style={{display:'grid',gap:14}}>
        <Link href="/stuff/alerts" style={{display:'block',padding:18,border:'1px solid #ddd',borderRadius:12,color:'inherit',textDecoration:'none'}}>
          <strong>Alerts</strong>
          <div className="muted">Choose your pick reminders and enable push on your device.</div>
        </Link>
        <Link href="/rules" style={{display:'block',padding:18,border:'1px solid #ddd',borderRadius:12,color:'inherit',textDecoration:'none'}}>
          <strong>Official Rules</strong>
        </Link>
        <Link href="/audit-log" style={{display:'block',padding:18,border:'1px solid #ddd',borderRadius:12,color:'inherit',textDecoration:'none'}}>
          <strong>Audit Log</strong>
        </Link>
      </div>
    </section>
  </main>
}
