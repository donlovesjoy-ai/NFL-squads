import Link from 'next/link'

export function Nav({ commissioner=false }:{ commissioner?:boolean }){
  return <nav>
    <Link href="/dashboard">Home</Link>
    <Link href="/my-pick">My Pick</Link>
    <Link href="/schedule">Schedule</Link>
    <Link href="/standings">Standings</Link>
    <Link href="/playoffs">Playoffs</Link>
    {commissioner && <Link href="/commissioner/setup">League Setup</Link>}
    {commissioner && <Link href="/commissioner/results">Lines & Results</Link>}
    {commissioner && <Link href="/commissioner/live-feed">Live Feed</Link>}
    {commissioner && <Link href="/commissioner/playoffs">Playoff Control</Link>}
  </nav>
}
