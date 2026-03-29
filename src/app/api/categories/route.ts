import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/utils/supabase/server'
import { type Plan } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan

  // Fetch user's custom categories
  const { data: userCategories } = await supabase
    .from('categories')
    .select('id, user_id, name, type, icon, color, is_default, created_at')
    .eq('user_id', user.id)
    .eq('is_default', false)
    .order('name')

  // Fetch default (built-in) categories
  const { data: defaultCategories } = await supabase
    .from('categories')
    .select('id, user_id, name, type, icon, color, is_default, created_at')
    .is('user_id', null)
    .order('name')

  return NextResponse.json({
    plan,
    userCategories: userCategories ?? [],
    defaultCategories: defaultCategories ?? [],
  })
}
