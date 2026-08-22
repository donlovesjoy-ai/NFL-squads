'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function commissioner(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')
  const {data:p}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  if(p?.role!=='commissioner') redirect('/dashboard')
  return supabase
}

async function done(path='/commissioner/playoffs'){
  revalidatePath('/playoffs')
  revalidatePath('/commissioner/playoffs')
  redirect(path)
}

export async function initialize(){
  const s=await commissioner()
  const {error}=await s.rpc('initialize_playoffs',{p_season:2026})
  if(error) redirect('/commissioner/playoffs?error=initialize')
  await done('/commissioner/playoffs?ok=initialized')
}

export async function grade16(){
  const s=await commissioner()
  const {error}=await s.rpc('grade_playoff_week',{p_season:2026,p_week:16})
  if(error) redirect('/commissioner/playoffs?error=grade16')
  await done('/commissioner/playoffs?ok=graded16')
}

export async function build17(){
  const s=await commissioner()
  const {error}=await s.rpc('build_week17',{p_season:2026})
  if(error) redirect('/commissioner/playoffs?error=build17')
  await done('/commissioner/playoffs?ok=built17')
}

export async function grade17(){
  const s=await commissioner()
  const {error}=await s.rpc('grade_playoff_week',{p_season:2026,p_week:17})
  if(error) redirect('/commissioner/playoffs?error=grade17')
  await done('/commissioner/playoffs?ok=graded17')
}

export async function build18(){
  const s=await commissioner()
  const {error}=await s.rpc('build_week18',{p_season:2026})
  if(error) redirect('/commissioner/playoffs?error=build18')
  await done('/commissioner/playoffs?ok=built18')
}

export async function grade18(){
  const s=await commissioner()
  const {error}=await s.rpc('grade_playoff_week',{p_season:2026,p_week:18})
  if(error) redirect('/commissioner/playoffs?error=grade18')
  await done('/commissioner/playoffs?ok=graded18')
}

export async function finalize(){
  const s=await commissioner()
  const {error}=await s.rpc('finalize_placements',{p_season:2026})
  if(error) redirect('/commissioner/playoffs?error=finalize')
  await done('/commissioner/playoffs?ok=finalized')
}
