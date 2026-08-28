 'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function commissioner(){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const {data:profile}=
    await supabase
      .from('users')
      .select('role')
      .eq(
        'id',
        user.id
      )
      .maybeSingle()

  if(
    profile?.role!==
    'commissioner'
  ){
    redirect('/dashboard')
  }

  return supabase
}

async function done(
  path='/commissioner/playoffs'
){
  revalidatePath(
    '/playoffs'
  )

  revalidatePath(
    '/commissioner/playoffs'
  )

  redirect(path)
}

export async function initialize(){
  const supabase=
    await commissioner()

  const {error}=
    await supabase.rpc(
      'initialize_playoff_groups',
      {
        p_season:2026
      }
    )

  if(error){
    redirect(
      '/commissioner/playoffs?error=initialize'
    )
  }

  await done(
    '/commissioner/playoffs?ok=initialized'
  )
}

export async function grade16(){
  const supabase=
    await commissioner()

  const {error}=
    await supabase.rpc(
      'grade_playoff_group_round',
      {
        p_season:2026,
        p_week:16
      }
    )

  if(error){
    redirect(
      '/commissioner/playoffs?error=grade16'
    )
  }

  await done(
    '/commissioner/playoffs?ok=graded16'
  )
}

export async function grade17(){
  const supabase=
    await commissioner()

  const {error}=
    await supabase.rpc(
      'grade_playoff_group_round',
      {
        p_season:2026,
        p_week:17
      }
    )

  if(error){
    redirect(
      '/commissioner/playoffs?error=grade17'
    )
  }

  await done(
    '/commissioner/playoffs?ok=graded17'
  )
}

export async function grade18(){
  const supabase=
    await commissioner()

  const {error}=
    await supabase.rpc(
      'grade_playoff_group_round',
      {
        p_season:2026,
        p_week:18
      }
    )

  if(error){
    redirect(
      '/commissioner/playoffs?error=grade18'
    )
  }

  await done(
    '/commissioner/playoffs?ok=graded18'
  )
}

export async function resolveCoinToss(
  formData:FormData
){
  const supabase=
    await commissioner()

  const week=
    Number(
      formData.get(
        'week'
      )
    )

  const groupCode=
    String(
      formData.get(
        'group_code'
      )||''
    )

  const winnerSquadId=
    Number(
      formData.get(
        'winner_squad_id'
      )
    )

  if(
    ![16,17,18].includes(
      week
    ) ||
    !groupCode ||
    !winnerSquadId
  ){
    redirect(
      '/commissioner/playoffs?error=coin_toss'
    )
  }

  const {error}=
    await supabase.rpc(
      'resolve_playoff_coin_toss',
      {
        p_season:
          2026,

        p_week:
          week,

        p_group_code:
          groupCode,

        p_winner_squad_id:
          winnerSquadId
      }
    )

  if(error){
    redirect(
      '/commissioner/playoffs?error=coin_toss'
    )
  }

  await done(
    '/commissioner/playoffs?ok=coin_toss'
  )
}