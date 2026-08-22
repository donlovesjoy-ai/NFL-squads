'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireCommissioner(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')

  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  if(profile?.role!=='commissioner') redirect('/dashboard')
  return supabase
}

export async function saveSquad(formData:FormData){
  const supabase=await requireCommissioner()

  const userId=String(formData.get('user_id')||'').trim() || null
  const squadName=String(formData.get('squad_name')||'').trim()
  const ownerName=String(formData.get('owner_name')||'').trim()
  const nflTeamIdRaw=String(formData.get('nfl_team_id')||'')
  const divisionRaw=String(formData.get('division')||'')
  const nflTeamId=nflTeamIdRaw ? Number(nflTeamIdRaw) : null
  const division=divisionRaw ? Number(divisionRaw) : null

 if(!squadName || !ownerName || !userId || !nflTeamId || !division){
    redirect('/commissioner/setup?error=missing')
  }

  const {data:existing}=await supabase
    .from('squads')
    .select('id,division')
    .eq('season_year',2026)
    .eq('user_id',userId)
    .maybeSingle()
const {count:divisionCount}=await supabase
  .from('squads')
  .select('id',{count:'exact',head:true})
  .eq('season_year',2026)
  .eq('division',division)

const movingIntoFullDivision =
  divisionCount !== null &&
  divisionCount >= 4 &&
  (!existing || existing.division !== division)

if(movingIntoFullDivision){
  redirect('/commissioner/setup?error=division_full')
}
  let error
  if(existing){
    ;({error}=await supabase.from('squads').update({
      owner_name:ownerName,
      squad_name:squadName,
      nfl_team_id:nflTeamId,
      division
    }).eq('id',existing.id))
  }else{
    ;({error}=await supabase.from('squads').insert({
      owner_name:ownerName,
      user_id:userId,
      season_year:2026,
      squad_name:squadName,
      nfl_team_id:nflTeamId,
      division
    }))
  }

  if(error) redirect('/commissioner/setup?error=duplicate')
  revalidatePath('/commissioner/setup')
  revalidatePath('/standings')
  redirect('/commissioner/setup?saved=1')
}

export async function deleteSquad(formData:FormData){
  const supabase=await requireCommissioner()
  const id=Number(formData.get('id'))
  if(id) await supabase.from('squads').delete().eq('id',id).eq('season_year',2026)
  revalidatePath('/commissioner/setup')
  redirect('/commissioner/setup')
}

export async function claimCommissioner(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')
  await supabase.rpc('claim_initial_commissioner')
  redirect('/commissioner/setup')
}


export async function saveDivisionNames(formData:FormData){
  const supabase=await requireCommissioner()
  const rows=[1,2,3,4].map(d=>({
    season_year:2026,
    division:d,
    division_name:String(formData.get(`division_${d}`)||`Division ${d}`).trim() || `Division ${d}`,
    updated_at:new Date().toISOString()
  }))
  const {error}=await supabase.from('division_names').upsert(rows,{onConflict:'season_year,division'})
  if(error) redirect('/commissioner/setup?error=division_names')
  revalidatePath('/commissioner/setup')
  revalidatePath('/standings')
  revalidatePath('/dashboard')
  redirect('/commissioner/setup?divisions=saved')
}
