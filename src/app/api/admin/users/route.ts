import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const STATUS_GROUPS: Record<string, string[]> = {
  trial: ['trial'],
  premium: ['premium'],
  grace_period: ['grace_period'],
  expired: ['trial_expired', 'cancelled'],
}

/** Tanggal berakhir yang relevan untuk status user. */
function endsAt(u: { subscription_status: string; trial_ends_at: string | null; subscription_ends_at: string | null }) {
  return u.subscription_status === 'trial' ? u.trial_ends_at : u.subscription_ends_at
}

/**
 * GET /api/admin/users?q=&status=&expiring=1&telegram=1|0
 * status: trial | premium | grace_period | expired (trial_expired + cancelled)
 * expiring=1: trial/premium yang berakhir dalam 3 hari ke depan.
 */
export async function GET(request: NextRequest) {
  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  // Buang karakter yang punya arti di sintaks filter PostgREST (koma, kurung, titik dua).
  const q = (searchParams.get('q') ?? '').replace(/[,():*%\\]/g, ' ').trim()
  const status = searchParams.get('status') ?? ''
  const expiring = searchParams.get('expiring') === '1'
  const telegram = searchParams.get('telegram')

  const admin = createAdminClient()
  let query = admin
    .from('profiles')
    .select('id, email, full_name, role, subscription_status, trial_ends_at, subscription_ends_at, telegram_chat_id, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
  if (STATUS_GROUPS[status]) query = query.in('subscription_status', STATUS_GROUPS[status])
  if (telegram === '1') query = query.not('telegram_chat_id', 'is', null)
  if (telegram === '0') query = query.is('telegram_chat_id', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let users = (data ?? []).map((u) => ({ ...u, ends_at: endsAt(u) }))
  if (expiring) {
    const now = Date.now()
    const limit = now + 3 * 24 * 60 * 60 * 1000
    users = users.filter((u) => {
      if (!['trial', 'premium'].includes(u.subscription_status) || !u.ends_at) return false
      const t = new Date(u.ends_at).getTime()
      return t >= now && t <= limit
    })
  }

  return NextResponse.json({ users, total: users.length })
}
