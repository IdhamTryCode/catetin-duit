import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Link from 'next/link'
import { Download, Plus } from 'lucide-react'
import { type TransactionRow, type CategoryJoin } from '@/types'
import { TransactionsTable } from './transactions-table'
import { parsePageParam } from '@/lib/utils'
import { PAGE_SIZE, type Plan } from '@/lib/constants'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, plan')
    .eq('id', user!.id)
    .single()

  const timezone   = profile?.timezone ?? 'Asia/Jakarta'
  const plan       = (profile?.plan ?? 'free') as Plan
  const canExport  = plan === 'starter' || plan === 'premium'
  const page       = parsePageParam(searchParams?.page)
  const pageSize   = PAGE_SIZE
  const typeFilter = searchParams?.type

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

  const { data, count } = await query
  const transactions: TransactionRow[] = (data ?? []).map(tx => ({
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    description: tx.description,
    transaction_date: tx.transaction_date,
    needs_review: tx.needs_review,
    source: tx.source,
    created_at: tx.created_at,
    // Supabase many-to-one join returns an object at runtime, not an array
    categories: (tx.categories as unknown) as CategoryJoin,
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Transaksi</h1>
          <p className="text-sm text-muted-foreground">Riwayat dan kelola semua transaksi</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Export CSV — hanya untuk Starter & Premium */}
          {canExport ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-1.5">
              <a href="/api/export/csv" download>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </a>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-1.5 text-muted-foreground">
              <Link href="/dashboard/subscription">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/dashboard/transactions/new" className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tambah Manual</span>
              <span className="sm:hidden">Tambah</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between gap-2">
            {/* Filter tabs */}
            <div className="flex items-center gap-1.5">
              <Button asChild variant={!typeFilter ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3">
                <Link href="/dashboard/transactions">Semua</Link>
              </Button>
              <Button asChild variant={typeFilter === 'income' ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3">
                <Link href="/dashboard/transactions?type=income">Pemasukan</Link>
              </Button>
              <Button asChild variant={typeFilter === 'expense' ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3">
                <Link href="/dashboard/transactions?type=expense">Pengeluaran</Link>
              </Button>
            </div>
            {/* Export CSV mobile — ikon saja */}
            {canExport && (
              <a href="/api/export/csv" download className="sm:hidden p-1.5 rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 md:px-6 md:pb-6">
          <TransactionsTable
            transactions={transactions}
            timezone={timezone}
            totalCount={count ?? 0}
            page={page}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>
    </div>
  )
}
