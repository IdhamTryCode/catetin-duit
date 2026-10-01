import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { type Category, type TransactionRow } from '@/types'
import { BTN_SECONDARY, CARD, PageHeader } from '@/components/dashboard/ui'
import { TransactionsTable } from './transactions-table'
import { AddTransaction } from './add-transaction'
import { parsePageParam } from '@/lib/utils'
import { PAGE_SIZE, resolvePlan } from '@/lib/constants'
import { promoActive } from '@/lib/settings'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, subscription_status')
    .eq('id', user!.id)
    .single()

  const timezone   = profile?.timezone ?? 'Asia/Jakarta'
  const canExport  = resolvePlan(profile?.subscription_status, await promoActive()) === 'premium'
  const sp         = await searchParams
  const page       = parsePageParam(sp?.page)
  const pageSize   = PAGE_SIZE
  const typeFilter = sp?.type

  let query = supabase
    .from('transactions')
    .select(
      'id, amount, type, description, transaction_date, needs_review, source, created_at, categories(name, icon)',
      { count: 'exact' }
    )
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (typeFilter) query = query.eq('type', typeFilter)

  // Kategori untuk modal Tambah Manual: bawaan (user_id NULL) + milik user
  const [{ data, count }, { data: categoryRows }] = await Promise.all([
    query,
    supabase
      .from('categories')
      .select('id, user_id, name, type, icon, color, is_default, created_at')
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order('name'),
  ])
  const transactions = (data ?? []) as TransactionRow[]
  const categories = (categoryRows ?? []) as Category[]

  const filters = [
    { href: '/dashboard/transactions', label: 'Semua', active: !typeFilter },
    { href: '/dashboard/transactions?type=income', label: 'Pemasukan', active: typeFilter === 'income' },
    { href: '/dashboard/transactions?type=expense', label: 'Pengeluaran', active: typeFilter === 'expense' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transaksi"
        subtitle="Riwayat dan kelola semua transaksi"
        actions={
          <>
            {/* Export CSV — hanya untuk akses penuh (trial/premium) */}
            {canExport ? (
              <a href="/api/export/csv" download className={BTN_SECONDARY}>↓ Export CSV</a>
            ) : (
              <Link href="/dashboard/subscription" className={`${BTN_SECONDARY} text-cd-muted-2`}>↓ Export CSV</Link>
            )}
            <AddTransaction categories={categories} />
          </>
        }
      />

      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cd-line-soft px-5 py-4">
          <div className="flex gap-1 rounded-[11px] bg-cd-bg p-1">
            {filters.map((f) => (
              <Link
                key={f.label}
                href={f.href}
                aria-current={f.active ? 'page' : undefined}
                className={
                  f.active
                    ? 'rounded-lg bg-white px-3.5 py-2 text-[13px] font-bold text-cd-ink shadow-[0_1px_2px_rgba(6,20,13,.1)]'
                    : 'rounded-lg px-3.5 py-2 text-[13px] font-semibold text-cd-muted-2 hover:text-cd-ink'
                }
              >
                {f.label}
              </Link>
            ))}
          </div>
          <span className="text-[13px] text-cd-muted-2">{count ?? 0} transaksi</span>
        </div>
        <TransactionsTable
          transactions={transactions}
          timezone={timezone}
          totalCount={count ?? 0}
          page={page}
          pageSize={pageSize}
          typeFilter={typeFilter}
          categories={categories}
        />
      </div>
    </div>
  )
}
