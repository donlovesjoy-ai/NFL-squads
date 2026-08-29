 'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireCommissioner(){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth
      .getUser()

  if(!user){
    redirect('/login')
  }

  const {
    data:profile
  }=
    await supabase
      .from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle()

  if(profile?.role!=='commissioner'){
    redirect('/dashboard')
  }

  return supabase
}

function getRpcErrorCode(
  message:string|undefined
){
  if(!message){
    return 'unknown'
  }

  const knownErrors=[
    'missing',
    'division_full',
    'duplicate',
    'bad_division',
    'bad_user',
    'bad_team',
    'not_found',
    'commissioner_only'
  ]

  for(const code of knownErrors){
    if(message.includes(code)){
      return code
    }
  }

  return 'unknown'
}

export async function saveSquad(
  formData:FormData
){
  const supabase=
    await requireCommissioner()

  const userId=
    String(
      formData.get('user_id')||''
    ).trim()

  const squadName=
    String(
      formData.get('squad_name')||''
    ).trim()

  const ownerName=
    String(
      formData.get('owner_name')||''
    ).trim()

  const nflTeamIdRaw=
    String(
      formData.get('nfl_team_id')||''
    ).trim()

  const divisionRaw=
    String(
      formData.get('division')||''
    ).trim()

  const nflTeamId=
    nflTeamIdRaw
      ? Number(nflTeamIdRaw)
      : null

  const division=
    divisionRaw
      ? Number(divisionRaw)
      : null

  if(
    !userId
    || !squadName
    || !ownerName
    || !nflTeamId
    || !division
  ){
    redirect(
      '/commissioner/setup?error=missing'
    )
  }

  const {
    error
  }=
    await supabase.rpc(
      'commissioner_save_squad',
      {
        p_user_id:userId,
        p_squad_name:squadName,
        p_owner_name:ownerName,
        p_nfl_team_id:nflTeamId,
        p_division:division,
        p_season:2026
      }
    )

  if(error){
    console.error(
      'commissioner_save_squad failed',
      error
    )

    const code=
      getRpcErrorCode(
        error.message
      )

    if(code==='division_full'){
      redirect(
        '/commissioner/setup?error=division_full'
      )
    }

    if(
      code==='duplicate'
      || code==='bad_user'
      || code==='bad_team'
      || code==='bad_division'
    ){
      redirect(
        '/commissioner/setup?error=duplicate'
      )
    }

    if(code==='missing'){
      redirect(
        '/commissioner/setup?error=missing'
      )
    }

    redirect(
      '/commissioner/setup?error=save'
    )
  }

  revalidatePath(
    '/commissioner/setup'
  )

  revalidatePath(
    '/standings'
  )

  revalidatePath(
    '/dashboard'
  )

  revalidatePath(
    '/schedule'
  )

  redirect(
    '/commissioner/setup?saved=1'
  )
}

export async function deleteSquad(
  formData:FormData
){
  const supabase=
    await requireCommissioner()

  const id=
    Number(
      formData.get('id')
    )

  if(!id){
    redirect(
      '/commissioner/setup?error=delete'
    )
  }

  const {
    error
  }=
    await supabase.rpc(
      'commissioner_delete_squad',
      {
        p_squad_id:id,
        p_season:2026
      }
    )

  if(error){
    console.error(
      'commissioner_delete_squad failed',
      error
    )

    redirect(
      '/commissioner/setup?error=delete'
    )
  }

  revalidatePath(
    '/commissioner/setup'
  )

  revalidatePath(
    '/standings'
  )

  revalidatePath(
    '/schedule'
  )

  revalidatePath(
    '/dashboard'
  )

  redirect(
    '/commissioner/setup?removed=1'
  )
}

export async function claimCommissioner(){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth
      .getUser()

  if(!user){
    redirect('/login')
  }

  await supabase.rpc(
    'claim_initial_commissioner'
  )

  redirect(
    '/commissioner/setup'
  )
}

export async function saveDivisionNames(
  formData:FormData
){
  const supabase=
    await requireCommissioner()

  const rows=
    [1,2,3,4].map(
      (division)=>({
        season_year:2026,
        division,
        division_name:
          String(
            formData.get(
              `division_${division}`
            )
            || `Division ${division}`
          ).trim()
          || `Division ${division}`,
        updated_at:
          new Date()
            .toISOString()
      })
    )

  const {
    error
  }=
    await supabase
      .from('division_names')
      .upsert(
        rows,
        {
          onConflict:
            'season_year,division'
        }
      )

  if(error){
    console.error(
      'saveDivisionNames failed',
      error
    )

    redirect(
      '/commissioner/setup?error=division_names'
    )
  }

  revalidatePath(
    '/commissioner/setup'
  )

  revalidatePath(
    '/standings'
  )

  revalidatePath(
    '/dashboard'
  )

  redirect(
    '/commissioner/setup?divisions=saved'
  )
}