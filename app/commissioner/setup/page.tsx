import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'
import { saveSquad, deleteSquad, claimCommissioner, saveDivisionNames } from './actions'

export default async function CommissionerSetup({searchParams}:{searchParams:Promise<{saved?:string,error?:string}>}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase.from('users').select('role,email').eq('id',user.id).maybeSingle()

  if(profile?.role!=='commissioner'){
    return <main className="wrap">
      <h1>NFL Squads Commissioner Setup</h1>
      <div className="card">
        <p>This account is not currently the commissioner.</p>
        <p className="muted">If no commissioner exists yet, this button will claim the commissioner role for the first account only.</p>
        <form action={claimCommissioner}><button className="submit">Claim Initial Commissioner Role</button></form>
      </div>
    </main>
  }

  const [{data:profiles},{data:teams},{data:squads},{data:divisionNames}] = await Promise.all([
  supabase.from('users')
    .select('id,email,role')
    .order('email'),

  supabase.from('nfl_teams')
    .select('id,name,abbreviation')
    .order('name'),

  supabase.from('squads')
    .select('id,user_id,owner_name,squad_name,nfl_team_id,division,users(email),nfl_teams(name,abbreviation)')
    .eq('season_year',2026)
    .order('division')
    .order('id'),

  supabase.from('division_names')
    .select('division,division_name')
    .eq('season_year',2026)
    .order('division')
])

  const assignedUsers=new Set((squads||[]).map((s:any)=>s.user_id))
  const assignedTeams=new Set((squads||[]).map((s:any)=>s.nfl_team_id))
  const openUsers=(profiles||[]).filter((p:any)=>!assignedUsers.has(p.id))
  const openTeams=(teams||[]).filter((t:any)=>!assignedTeams.has(t.id))

  return <main className="wrap">
    <div className="top">
      <div><div className="big">NFL SQUADS</div><div className="muted">2026 Commissioner Setup</div></div>
    </div>
    <Nav commissioner/>

    {sp.saved&&<p className="status">Squad assignment saved.</p>}
    {sp.error==='missing'&&<p className="status">Fill in owner, squad name, NFL team and division.</p>}
    {sp.error==='duplicate'&&<p className="status">That owner or NFL team is already assigned for 2026.</p>}
  {sp.error==='division_full'&&<p className="status">That division already has 4 squads.</p>}
    <section className="card">
      <section className="card">
  <h2>Division Names</h2>
  <form action={saveDivisionNames}>
    {(divisionNames||[]).map((d:any)=>
      <div key={d.division}>
        <label>Division {d.division}</label>
        <input
          name={`division_${d.division}`}
          defaultValue={d.division_name}
          required
        />
      </div>
    )}

    <button className="submit" type="submit">
      Save Division Names
    </button>
  </form>
</section>
      <h2>Add / Assign Squad</h2>
      <p className="muted">Owner accounts appear here after each person creates an account. NFL teams disappear from the dropdown once assigned.</p>
      <form action={saveSquad}>
        <label>Owner account</label>
        <select name="user_id" required defaultValue="">
          <option value="" disabled>Select owner</option>
          {openUsers.map((p:any)=><option key={p.id} value={p.id}>{p.email}{p.role==='commissioner'?' (Commissioner)':''}</option>)}
        </select>
      <label>Owner first name</label>
<input
  name="owner_name"
  placeholder="Example: Don"
  required
/>
        <label>Custom squad name</label>
        <input name="squad_name" placeholder="Example: Dawg Pound Elite" required/>

        <label>NFL franchise</label>
        <select name="nfl_team_id" required defaultValue="">
          <option value="" disabled>Select NFL team</option>
          {openTeams.map((t:any)=><option key={t.id} value={t.id}>{t.name} ({t.abbreviation})</option>)}
        </select>

      <label>Division</label>
<select name="division" required defaultValue="">
  <option value="" disabled>Select division</option>
  {(divisionNames||[]).map((d:any)=>
    <option key={d.division} value={d.division}>
      {d.division_name}
    </option>
  )}
</select>

        <button className="submit" type="submit">Save Squad</button>
      </form>
    </section>

    <section className="card">
      <h2>2026 League Setup</h2>
      <p><b>{(squads||[]).length}/16 squads assigned</b></p>
      {(squads||[]).length===0 ? <p className="muted">No squads assigned yet.</p> :
      <table>
        <thead><tr><th>Division</th><th>Owner</th><th>Squad</th><th>NFL Team</th><th></th></tr></thead>
        <tbody>
       {(squads||[]).map((s:any)=><tr key={s.id}>
  <td colSpan={5}>
    <form action={saveSquad}>
      <input type="hidden" name="user_id" value={s.user_id}/>

      <div className="grid">
        <div>
          <label>Owner first name</label>
          <input
            name="owner_name"
            defaultValue={s.owner_name || ''}
            required
          />
          <div className="muted">{s.users?.email}</div>
        </div>

        <div>
          <label>Squad name</label>
          <input
            name="squad_name"
            defaultValue={s.squad_name}
            required
          />
        </div>

        <div>
          <label>NFL team</label>
          <select name="nfl_team_id" defaultValue={s.nfl_team_id} required>
            <option value={s.nfl_team_id}>
              {s.nfl_teams?.name}
            </option>

            {openTeams.map((t:any)=>
              <option key={t.id} value={t.id}>
                {t.name} ({t.abbreviation})
              </option>
            )}
          </select>
        </div>

        <div>
          <label>Division</label>
          <select name="division" defaultValue={s.division} required>
            {(divisionNames||[]).map((d:any)=>
              <option key={d.division} value={d.division}>
                {d.division_name}
              </option>
            )}
          </select>
        </div>
      </div>

      <button className="submit" type="submit">
        Save Changes
      </button>
    </form>

    <form action={deleteSquad}>
      <input type="hidden" name="id" value={s.id}/>
      <button type="submit">Remove Squad</button>
    </form>
  </td>
</tr>)}  
        </tbody>
      </table>}
    </section>

    <section className="card">
      <h2>Draft Board</h2>
      <div className="grid">
        {(teams||[]).map((t:any)=><div className="status" key={t.id}>
          <b>{t.abbreviation}</b> — {t.name}<br/>
          <span className="muted">{assignedTeams.has(t.id)?'Assigned':'Available'}</span>
        </div>)}
      </div>
    </section>
  </main>
}
