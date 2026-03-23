import { createClient } from '@/utils/supabase/server'
import { formatInTimeZone } from 'date-fns-tz'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { TrendingUp, TrendingDown, Wallet, MessageCircle, AlertTriangle, ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type RecentTransaction, type ChartDataPoint, getJoinedCategory } from '@/types'
import { OverviewChart } from './overview-chart'

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

interface DashboardData {
  income: number
  expense: number
  recentTransactions: RecentTransaction[]
  chartData: ChartDataPoint[]
}

async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('transaction_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('transaction_date', format(monthEnd, 'yyyy-MM-dd'))

  const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0

  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('id, amount, type, description, transaction_date, needs_review, categories(name, icon)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)

  const chartData: ChartDataPoint[] = []
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

  return {
    income,
    expense,
    recentTransactions: (recentTransactions ?? []) as RecentTransaction[],
    chartData,
  }
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
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const currentMonth = format(new Date(), 'MMMM yyyy')

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">

      {/* Page title - desktop only */}
      <div className="hidden md:block">
        <h1 className="text-xl font-bold">Beranda</h1>
        <p className="text-sm text-muted-foreground">{currentMonth}</p>
      </div>

      {/* Mobile: month label */}
      <div className="md:hidden">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{currentMonth}</p>
      </div>

      {/* Alert banners */}
      {!profile?.telegram_chat_id && (
        <Alert className="border-blue-500/30 bg-blue-500/10 [&>svg]:text-blue-600">
          <MessageCircle className="h-4 w-4" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Hubungkan Telegram</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="text-blue-700/80 dark:text-blue-300/80">Catat transaksi langsung dari chat</span>
            <Button asChild size="sm" className="h-7 text-xs flex-shrink-0">
              <Link href="/dashboard/telegram">Hubungkan</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {profile?.subscription_status === 'trial' && daysLeft !== null && daysLeft <= 3 && (
        <Alert className="border-amber-500/30 bg-amber-500/10 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Trial berakhir dalam {daysLeft} hari
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="text-amber-700/80 dark:text-amber-300/80">Upgrade Premium Rp 29.000/bulan</span>
            <Button asChild size="sm" className="h-7 text-xs flex-shrink-0">
              <Link href="/dashboard/subscription">Upgrade</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-500/20 bg-green-500/10">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Pemasukan</span>
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            </div>
            <p className="text-base md:text-xl font-bold text-green-700 dark:text-green-400 truncate">
              {formatIDR(income)}
            </p>
            <p className="text-[10px] text-green-600/60 mt-0.5">bulan ini</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-red-700 dark:text-red-400">Pengeluaran</span>
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
            </div>
            <p className="text-base md:text-xl font-bold text-red-700 dark:text-red-400 truncate">
              {formatIDR(expense)}
            </p>
            <p className="text-[10px] text-red-600/60 mt-0.5">bulan ini</p>
          </CardContent>
        </Card>

        <Card className={netCashflow >= 0 ? 'border-primary/20 bg-primary/10' : 'border-red-500/20 bg-red-500/10'}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${netCashflow >= 0 ? 'text-primary' : 'text-red-700 dark:text-red-400'}`}>Net</span>
              <Wallet className={`h-3.5 w-3.5 ${netCashflow >= 0 ? 'text-primary' : 'text-red-600'}`} />
            </div>
            <p className={`text-base md:text-xl font-bold truncate ${netCashflow >= 0 ? 'text-primary' : 'text-red-700 dark:text-red-400'}`}>
              {formatIDR(netCashflow)}
            </p>
            <p className={`text-[10px] mt-0.5 ${netCashflow >= 0 ? 'text-primary/60' : 'text-red-600/60'}`}>cashflow</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Tren 6 Bulan</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Transaksi Terbaru</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary px-2">
            <Link href="/dashboard/transactions">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length > 0 ? (
            <div className="divide-y">
              {recentTransactions.map((tx) => {
                const category = getJoinedCategory(tx.categories)
                const emoji = category?.icon ?? (tx.type === 'income' ? '💰' : '💸')
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-base">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description ?? category?.name ?? 'Transaksi'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatInTimeZone(new Date(tx.transaction_date), timezone, 'dd MMM')}
                        {category?.name && ` · ${category.name}`}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Zap className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Belum ada transaksi</p>
              <p className="text-xs text-muted-foreground mt-1">
                Chat ke bot Telegram untuk mulai mencatat
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/dashboard/telegram">Hubungkan Telegram</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
