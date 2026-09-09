import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import { logout } from '../logout/actions'

export default async function CommissionerHub(){
  const supabase=await createClient()

  const {
    data:{user}
  }=await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  if(profile?.role!=='commissioner'){
    redirect('/dashboard')
  }

  const options=[
    {
      label:'Scoring Alerts',
      href:'/notifications'
    },
    {
      label:'League Setup',
      href:'/commissioner/setup'
    },
    {
      label:'Lines & Results',
      href:'/commissioner/results'
    },
    {
      label:'Live Feed',
      href:'/commissioner/live-feed'
    },
    {
      label:'Playoff Control',
      href:'/commissioner/playoffs'
    },
    {
      label:'Audit Log',
      href:'/audit-log'
    },
    {
      label:'Login Log',
      href:'/commissioner/login-log'
    }
  ]

  return (
    <main className="wrap">
      <div
        className="top"
        style={{
          justifyContent:'center',
          textAlign:'center'
        }}
      >
        <div style={{width:'100%'}}>
          <div className="big">
            NFL SQUADS
          </div>

          <div className="muted">
            Commissioner Shit
          </div>
        </div>
      </div>

      <Nav commissioner={true}/>

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h1>
          Commissioner Shit
        </h1>

        <div
          style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',
            gap:10,
            maxWidth:720,
            margin:'18px auto 0'
          }}
        >
          {options.map(option=>(
            <a
              key={option.href}
              href={option.href}
              className="submit"
              style={{
                display:'block',
                textDecoration:'none',
                textAlign:'center',
                padding:'12px 14px'
              }}
            >
              {option.label}
            </a>
          ))}
        </div>

        <form
          action={logout}
          style={{
            marginTop:18
          }}
        >
          <button
            type="submit"
            style={{
              border:'1px solid #d8d8d8',
              background:'#fff',
              borderRadius:10,
              padding:'10px 16px',
              font:'inherit',
              fontWeight:800,
              cursor:'pointer'
            }}
          >
            Log Out
          </button>
        </form>
      </section>
    </main>
  )
}
