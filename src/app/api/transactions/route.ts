import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkDailyTransactionLimit } from '@/lib/plan'
import { type Plan } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)
  const offset = (page - 1) * limit

  let query = supabase
    .from('transactions')
    .select('*, categories(name, icon)', { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('type', type)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Enforce daily transaction limit based on user's plan ──────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan
  const { allowed, used, limit } = await checkDailyTransactionLimit(supabase, user.id, plan)

  if (!allowed) {
    return NextResponse.json(
      { error: `Batas transaksi harian plan ${plan} sudah tercapai (${used}/${limit}).`, used, limit },
      { status: 429 },
    )
  }

  const body = await request.json()
  const { amount, type, description, category_id, transaction_date } = body

  if (!amount || !type || !transaction_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount,
      type,
      description: description ?? null,
      category_id: category_id ?? null,
      transaction_date,
      source: 'web',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
