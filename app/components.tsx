 import Link from 'next/link'

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

      <Link href="/chat">
        Chat
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
    </nav>
  )
}