import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Link from 'next/link'
import { TransactionsTable } from './transactions-table'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user!.id)
    .single()

  const timezone = profile?.timezone ?? 'Asia/Jakarta'
  const page = Number(searchParams?.page ?? 1)
  const pageSize = 20
  const typeFilter = searchParams?.type

  let query = supabase
    .from('transactions')
    .select('id, amount, type, description, transaction_date, needs_review, source, created_at, categories(name, icon)', { count: 'exact' })
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (typeFilter) {
    query = query.eq('type', typeFilter)
  }

  const { data: transactions, count } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaksi</h1>
          <p className="text-muted-foreground">Riwayat dan kelola semua transaksi</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/transactions/new">+ Tambah Manual</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant={!typeFilter ? 'default' : 'outline'}
              size="sm"
            >
              <Link href="/dashboard/transactions">Semua</Link>
            </Button>
            <Button
              asChild
              variant={typeFilter === 'income' ? 'default' : 'outline'}
              size="sm"
            >
              <Link href="/dashboard/transactions?type=income">Pemasukan</Link>
            </Button>
            <Button
              asChild
              variant={typeFilter === 'expense' ? 'default' : 'outline'}
              size="sm"
            >
              <Link href="/dashboard/transactions?type=expense">Pengeluaran</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionsTable
            transactions={transactions ?? []}
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
