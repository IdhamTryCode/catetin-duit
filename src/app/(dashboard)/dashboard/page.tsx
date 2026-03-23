import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatInTimeZone } from 'date-fns-tz'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { TrendingUp, TrendingDown, Wallet, MessageCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OverviewChart } from './overview-chart'

async function getDashboardData(userId: string) {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Current month transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type, category_id, description, transaction_date, needs_review, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('transaction_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('transaction_date', format(monthEnd, 'yyyy-MM-dd'))
    .order('created_at', { ascending: false })

  const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0

  // Last 10 transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('id, amount, type, description, transaction_date, needs_review, categories(name, icon)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  // Monthly chart data (6 months)
  const chartData = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const mStart = format(startOfMonth(monthDate), 'yyyy-MM-dd')
    const mEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd')
    const { data: mTx } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd)

    chartData.push({
      month: format(monthDate, 'MMM'),
      income: mTx?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0,
      expense: mTx?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0,
    })
  }

  return { income, expense, recentTransactions, chartData }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, telegram_chat_id, subscription_status, trial_ends_at, timezone')
    .eq('id', user!.id)
    .single()

  const timezone = profile?.timezone ?? 'Asia/Jakarta'
  const { income, expense, recentTransactions, chartData } = await getDashboardData(user!.id)
  const netCashflow = income - expense

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const daysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Ringkasan keuangan bulan ini</p>
      </div>

      {/* Banners */}
      {!profile?.telegram_chat_id && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Hubungkan Telegram kamu</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Catat transaksi langsung dari chat Telegram</p>
            </div>
          </div>
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/telegram">Hubungkan</Link>
          </Button>
        </div>
      )}

      {profile?.subscription_status === 'trial' && daysLeft !== null && daysLeft <= 3 && (
        <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">Trial berakhir dalam {daysLeft} hari</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Upgrade ke Premium untuk terus menggunakan semua fitur</p>
            </div>
          </div>
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/subscription">Upgrade</Link>
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(income)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(expense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Cashflow</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(netCashflow)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Pengeluaran (6 Bulan)</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaksi Terbaru</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/transactions">Lihat Semua</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{(Array.isArray(tx.categories) ? tx.categories[0]?.icon : (tx.categories as { name: string; icon: string } | null)?.icon) ?? (tx.type === 'income' ? '💰' : '💸')}</span>
                    <div>
                      <p className="text-sm font-medium">{tx.description || (Array.isArray(tx.categories) ? tx.categories[0]?.name : (tx.categories as { name: string; icon: string } | null)?.name) || 'Transaksi'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatInTimeZone(new Date(tx.transaction_date), timezone, 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.needs_review && <Badge variant="destructive" className="text-xs">Review</Badge>}
                    <span className={`font-medium text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada transaksi bulan ini</p>
              <p className="text-sm mt-1">Mulai catat via Telegram atau tambah manual</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
