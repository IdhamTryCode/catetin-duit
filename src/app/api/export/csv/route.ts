import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/utils/supabase/server'
import { format } from 'date-fns'
import { type Plan } from '@/lib/constants'

/** Escape a CSV cell value — wraps in quotes and escapes inner quotes */
function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Plan gate: Free plan cannot export ──────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, timezone')
    .eq('id', user.id)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan
  if (plan === 'free') {
    return NextResponse.json(
      { error: 'Fitur export CSV tersedia untuk plan Starter dan Premium.' },
      { status: 403 },
    )
  }

  // ── Fetch all transactions (no pagination for export) ──────────────────────
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, type, description, transaction_date, source, created_at, categories(name)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Build CSV ──────────────────────────────────────────────────────────────
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Jumlah (Rp)', 'Sumber']

  const rows = (transactions ?? []).map((tx) => {
    const category = tx.categories as { name: string } | null
    return [
      csvCell(tx.transaction_date?.slice(0, 10) ?? ''),
      csvCell(tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
      csvCell(category?.name ?? ''),
      csvCell(tx.description),
      csvCell(tx.type === 'income' ? tx.amount : -tx.amount),
      csvCell(tx.source),
    ].join(',')
  })

  const csv = [headers.map(csvCell).join(','), ...rows].join('\r\n')

  const filename = `catetin-duit-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
