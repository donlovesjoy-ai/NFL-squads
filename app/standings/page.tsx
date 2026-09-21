import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'

export default async function StandingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  const { data: rows } = await supabase
    .from('standings')
    .select('wins,losses,pushes,ats_margin,selections_used,squads(squad_name,owner_name,nba_teams(name,abbreviation))')
    .eq('season_year', 2026)
    .is('competition_period_id', null)

  const standings = (rows || []).map((row: any) => {
    const squad = Array.isArray(row.squads) ? row.squads[0] : row.squads
    const team = Array.isArray(squad?.nba_teams) ? squad.nba_teams[0] : squad?.nba_teams
    const decisions = Number(row.wins || 0) + Number(row.losses || 0)
    const winPct = decisions ? Number(row.wins || 0) / decisions : 0
    return { ...row, squad, team, winPct }
  }).sort((a: any, b: any) => b.winPct - a.winPct || Number(b.ats_margin || 0) - Number(a.ats_margin || 0))

  return (
    <main style={{maxWidth:950,margin:'0 auto',padding:'28px 18px 60px'}}>
      <h1 style={{textAlign:'center'}}>NBA Squads Standings</h1>
      <Nav commissioner={profile?.role === 'commissioner'} />
      <div style={{marginTop:28,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
          <thead>
            <tr>
              {['#','Squad','NBA Team','Record','Win %','ATS +/-','Games Used'].map(h => <th key={h} style={{padding:'12px 10px',borderBottom:'1px solid #555',textAlign:'center'}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {standings.map((row: any, i: number) => (
              <tr key={`${row.squad?.squad_name}-${i}`}>
                <td style={{padding:12,textAlign:'center'}}>{i + 1}</td>
                <td style={{padding:12,textAlign:'center',fontWeight:800}}>{row.squad?.squad_name || '—'}</td>
                <td style={{padding:12,textAlign:'center'}}>{row.team?.abbreviation || row.team?.name || '—'}</td>
                <td style={{padding:12,textAlign:'center'}}>{row.wins}-{row.losses}-{row.pushes}</td>
                <td style={{padding:12,textAlign:'center'}}>{(row.winPct * 100).toFixed(1)}%</td>
                <td style={{padding:12,textAlign:'center'}}>{Number(row.ats_margin || 0) > 0 ? '+' : ''}{Number(row.ats_margin || 0).toFixed(1)}</td>
                <td style={{padding:12,textAlign:'center'}}>{row.selections_used}/50</td>
              </tr>
            ))}
            {!standings.length && <tr><td colSpan={7} style={{padding:30,textAlign:'center',opacity:.7}}>Standings will populate after squads are assigned and games are played.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}
