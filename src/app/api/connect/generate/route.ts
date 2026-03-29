import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/utils/supabase/server'

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthFromRequest(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting: max 3x per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('connect_codes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Rate limit exceeded. Coba lagi dalam 1 jam.' }, { status: 429 })
  }

  // Invalidate old codes
  await supabase
    .from('connect_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('used_at', null)

  // Generate new code
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('connect_codes')
    .insert({ user_id: user.id, code, expires_at: expiresAt })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ code, expires_at: expiresAt })
}
