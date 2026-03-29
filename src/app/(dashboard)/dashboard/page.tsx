import { createClient } from '@/utils/supabase/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { TrendingUp, TrendingDown, Wallet, MessageCircle, AlertTriangle, ArrowRight, Receipt, Bot } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type RecentTransaction, type ChartDataPoint, getJoinedCategory } from '@/types'
import { OverviewChart } from './overview-chart'
import { formatIDR, formatDateShort } from '@/lib/utils'
import { TRIAL_WARNING_THRESHOLD_DAYS } from '@/lib/constants'

interface DashboardData {
  income: number
  expense: number
  recentTransactions: RecentTransaction[]
  chartData: ChartDataPoint[]
}

/**
 * Fetch all dashboard data for a user in an optimized way.
 * Uses a single query for the 6-month chart data instead of 6 separate queries,
 * then aggregates client-side by month key (YYYY-MM).
 */
async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Current month summary
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('transaction_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('transaction_date', format(monthEnd, 'yyyy-MM-dd'))

  const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0

  // Recent transactions for the activity list
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('id, amount, type, description, transaction_date, needs_review, categories(name, icon)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)

  // ── 6-month chart data: single query instead of 6 separate queries ──────────
  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd')
  const today = format(monthEnd, 'yyyy-MM-dd')

  const { data: chartTx } = await supabase
    .from('transactions')
    .select('amount, type, transaction_date')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('transaction_date', sixMonthsAgo)
    .lte('transaction_date', today)

  // Group transactions by month key (YYYY-MM) and accumulate totals
  const monthlyTotals: Record<string, { income: number; expense: number }> = {}
  for (const tx of chartTx ?? []) {
    const key = tx.transaction_date.substring(0, 7) // "YYYY-MM"
    if (!monthlyTotals[key]) monthlyTotals[key] = { income: 0, expense: 0 }
    if (tx.type === 'income') monthlyTotals[key].income += Number(tx.amount)
    else if (tx.type === 'expense') monthlyTotals[key].expense += Number(tx.amount)
  }

  // Build ordered chartData for the last 6 months
  const chartData: ChartDataPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const key = format(monthDate, 'yyyy-MM')
    chartData.push({
      month: format(monthDate, 'MMM'),
      income: monthlyTotals[key]?.income ?? 0,
      expense: monthlyTotals[key]?.expense ?? 0,
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
    .select('full_name, telegram_chat_id, plan, subscription_status, trial_ends_at, timezone')
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
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none animate-fade-in">

      {/* Page title */}
      <div className="hidden md:block">
        <h1 className="text-xl font-bold text-foreground">Beranda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{currentMonth}</p>
      </div>

      {/* Mobile: month label */}
      <div className="md:hidden">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          {currentMonth}
        </p>
      </div>

      {/* Alert banners */}
      {!profile?.telegram_chat_id && (
        <Alert className="border-blue-400/30 bg-blue-500/8 [&>svg]:text-blue-500">
          <MessageCircle className="h-4 w-4" />
          <AlertTitle className="text-blue-800 font-semibold">Hubungkan Telegram</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="text-blue-700/75">Catat transaksi langsung dari chat</span>
            <Button asChild size="sm" className="h-7 text-xs flex-shrink-0">
              <Link href="/dashboard/telegram">Hubungkan</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {profile?.plan === 'free' && profile?.subscription_status === 'trial' && daysLeft !== null && daysLeft <= TRIAL_WARNING_THRESHOLD_DAYS && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-50/80 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 leading-tight">
                Trial berakhir dalam {daysLeft} hari
              </p>
              <p className="text-xs text-amber-700/70 mt-0.5">
                Upgrade untuk akses penuh tanpa batas
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="h-8 text-xs flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
            <Link href="/dashboard/subscription">Upgrade</Link>
          </Button>
        </div>
      )}

      {/* ── Summary Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">

        {/* Income */}
        <Card className="border-emerald-400/25 bg-gradient-to-br from-emerald-500/12 via-emerald-400/6 to-card">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-start justify-between mb-2.5">
              <span className="text-[10px] md:text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Pemasukan
              </span>
              <div className="h-6 w-6 md:h-7 md:w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-600 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-sm md:text-lg font-bold text-emerald-700 truncate tabular-nums leading-tight">
              {formatIDR(income)}
            </p>
            <p className="text-[10px] text-emerald-600/55 mt-1 font-medium">bulan ini</p>
          </CardContent>
        </Card>

        {/* Expense */}
        <Card className="border-rose-400/25 bg-gradient-to-br from-rose-500/12 via-rose-400/6 to-card">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-start justify-between mb-2.5">
              <span className="text-[10px] md:text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Pengeluaran
              </span>
              <div className="h-6 w-6 md:h-7 md:w-7 rounded-lg bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-rose-600 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-sm md:text-lg font-bold text-rose-700 truncate tabular-nums leading-tight">
              {formatIDR(expense)}
            </p>
            <p className="text-[10px] text-rose-600/55 mt-1 font-medium">bulan ini</p>
          </CardContent>
        </Card>

        {/* Net Cashflow */}
        <Card
          className={
            netCashflow >= 0
              ? 'border-primary/25 bg-gradient-to-br from-primary/12 via-primary/6 to-card'
              : 'border-rose-400/25 bg-gradient-to-br from-rose-500/12 via-rose-400/6 to-card'
          }
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-start justify-between mb-2.5">
              <span
                className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider ${
                  netCashflow >= 0 ? 'text-primary' : 'text-rose-700'
                }`}
              >
                Net
              </span>
              <div
                className={`h-6 w-6 md:h-7 md:w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  netCashflow >= 0 ? 'bg-primary/15' : 'bg-rose-500/15'
                }`}
              >
                <Wallet
                  className={`h-3 w-3 md:h-3.5 md:w-3.5 stroke-[2.5] ${
                    netCashflow >= 0 ? 'text-primary' : 'text-rose-600'
                  }`}
                />
              </div>
            </div>
            <p
              className={`text-sm md:text-lg font-bold truncate tabular-nums leading-tight ${
                netCashflow >= 0 ? 'text-primary' : 'text-rose-700'
              }`}
            >
              {formatIDR(netCashflow)}
            </p>
            <p
              className={`text-[10px] mt-1 font-medium ${
                netCashflow >= 0 ? 'text-primary/55' : 'text-rose-600/55'
              }`}
            >
              cashflow
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-semibold">Tren 6 Bulan</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3">
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* ── Recent Transactions ───────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-border/40 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Transaksi Terbaru</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary px-2 hover:bg-primary/8">
            <Link href="/dashboard/transactions">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-border/40">
              {recentTransactions.map((tx) => {
                const category = getJoinedCategory(tx.categories)
                const emoji = category?.icon ?? (tx.type === 'income' ? '💰' : '💸')
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors duration-150"
                  >
                    {/* Emoji icon */}
                    <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0 text-base shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-border/40">
                      {emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {tx.description ?? category?.name ?? 'Transaksi'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateShort(tx.transaction_date, timezone)}
                        {category?.name && (
                          <span className="text-muted-foreground/60"> · {category.name}</span>
                        )}
                      </p>
                    </div>

                    {/* Amount */}
                    <span
                      className={`text-sm font-semibold flex-shrink-0 tabular-nums ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatIDR(tx.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center mb-4 shadow-sm">
                <Receipt className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-semibold text-foreground">Belum ada transaksi</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] leading-relaxed">
                Mulai catat via bot Telegram atau tambah manual
              </p>
              <div className="flex gap-2 mt-5">
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link href="/dashboard/telegram">
                    <Bot className="h-3.5 w-3.5 mr-1.5" />
                    Hubungkan Telegram
                  </Link>
                </Button>
                <Button asChild size="sm" className="h-8 text-xs">
                  <Link href="/dashboard/transactions/new">+ Tambah Manual</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
