import Link from 'next/link'
import { logout } from './logout/actions'

export function Nav({
  commissioner=false
}:{
  commissioner?:boolean
}){
  return (
    <nav
      style={{
        display:'flex',
        justifyContent:'center',
        alignItems:'center',
        flexWrap:'wrap',
        gap:'10px 18px',
        width:'100%',
        textAlign:'center'
      }}
    >
      <Link href="/dashboard">
        Home
      </Link>

      <Link href="/my-pick">
        My Pick
      </Link>

      <Link href="/schedule">
        Schedule
      </Link>

      <Link href="/standings">
        Standings
      </Link>

      <Link href="/playoffs">
        Playoffs
      </Link>

      <Link href="/rules">
        Official Rules
      </Link>

      <Link href="/audit-log">
        Audit Log
      </Link>

      <Link href="/chat">
        Chat
      </Link>

      <Link href="/notifications">
        Scoring Alerts
      </Link>

      {commissioner && (
        <Link href="/commissioner/setup">
          League Setup
        </Link>
      )}

      {commissioner && (
        <Link href="/commissioner/results">
          Lines & Results
        </Link>
      )}

      {commissioner && (
        <Link href="/commissioner/live-feed">
          Live Feed
        </Link>
      )}

      {commissioner && (
        <Link href="/commissioner/playoffs">
          Playoff Control
        </Link>
      )}

      <form
        action={logout}
        style={{
          margin:0
        }}
      >
        <button
          type="submit"
          style={{
            border:'none',
            background:'transparent',
            padding:0,
            margin:0,
            font:'inherit',
            color:'inherit',
            textDecoration:'underline',
            cursor:'pointer'
          }}
        >
          Log Out
        </button>
      </form>
    </nav>
  )
}
