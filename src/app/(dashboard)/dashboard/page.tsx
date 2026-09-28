import { createClient } from '@/utils/supabase/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import Link from 'next/link'
import { BTN_PRIMARY, CARD, PageHeader, TxIcon } from '@/components/dashboard/ui'
import { type RecentTransaction, type ChartDataPoint, getJoinedCategory } from '@/types'
import { OverviewChart } from './overview-chart'
import { formatIDR, formatDateShort } from '@/lib/utils'
import { TRIAL_WARNING_THRESHOLD_DAYS, FREE_PROMO } from '@/lib/constants'

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
    .limit(4)

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
      month: format(monthDate, 'MMM', { locale: idLocale }),
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

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: idLocale })
  const hasData = recentTransactions.length > 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Beranda" subtitle={currentMonth} />

      {!profile?.telegram_chat_id && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-cd-dark px-6 py-5 text-white">
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">Hubungkan Telegram</span>
            <span className="text-sm text-cd-on-dark">Catat transaksi langsung dari chat. Butuh kurang dari semenit.</span>
          </div>
          <Link
            href="/dashboard/telegram"
            className="rounded-[11px] bg-cd-accent px-4 py-[11px] text-sm font-bold text-cd-dark hover:bg-cd-accent-hover"
          >
            Hubungkan
          </Link>
        </div>
      )}

      {!FREE_PROMO && profile?.subscription_status === 'trial' && daysLeft !== null && daysLeft <= TRIAL_WARNING_THRESHOLD_DAYS && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#F2DDB0] bg-[#FFF8EB] px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-[#6B4A0E]">Trial berakhir dalam {daysLeft} hari</span>
            <span className="text-sm text-[#6B5A36]">Upgrade ke Premium supaya pencatatan via Telegram tetap jalan.</span>
          </div>
          <Link href="/dashboard/subscription" className={BTN_PRIMARY}>Upgrade</Link>
        </div>
      )}

      {/* Ringkasan bulan ini */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <StatCard label="PEMASUKAN" value={formatIDR(income)} note="bulan ini" valueClass="text-cd-primary" />
        <StatCard label="PENGELUARAN" value={formatIDR(expense)} note="bulan ini" valueClass="text-cd-expense" />
        <div className="flex flex-col gap-2.5 rounded-[18px] bg-cd-dark p-[22px] text-white">
          <span className="text-xs font-bold tracking-[.07em] text-cd-on-dark-3">NET CASHFLOW</span>
          <span className={`truncate text-[28px] font-extrabold tracking-[-.02em] tabular-nums ${netCashflow < 0 ? 'text-[#FF8A8A]' : 'text-cd-accent-text'}`}>
            {netCashflow < 0 ? '−' : ''}{formatIDR(Math.abs(netCashflow))}
          </span>
          <span className="text-[13px] text-cd-on-dark-3">pemasukan − pengeluaran</span>
        </div>
      </div>

      {/* Tren 6 bulan */}
      <div className={`${CARD} flex flex-col gap-5 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-base font-bold">Tren 6 Bulan</span>
          <div className="flex gap-4 text-[13px] text-cd-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-cd-accent" />Pemasukan</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#F2A3A3]" />Pengeluaran</span>
          </div>
        </div>
        {hasData ? (
          <OverviewChart data={chartData} />
        ) : (
          <div className="grid h-[180px] place-items-center rounded-[14px] border border-dashed border-cd-line-strong p-4 text-center text-sm text-cd-muted-2">
            Grafik muncul setelah transaksi pertamamu tercatat.
          </div>
        )}
      </div>

      {/* Transaksi terbaru */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-base font-bold">Transaksi Terbaru</span>
          <Link href="/dashboard/transactions" className="text-sm font-semibold text-cd-primary hover:text-cd-primary-hover">
            Lihat semua →
          </Link>
        </div>
        {hasData ? (
          recentTransactions.map((tx) => {
            const category = getJoinedCategory(tx.categories)
            const income = tx.type === 'income'
            const catName = category?.name ?? 'Lainnya'
            return (
              <div key={tx.id} className="flex items-center gap-3.5 border-t border-cd-line-soft px-6 py-3.5">
                <TxIcon label={catName} income={income} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{tx.description ?? catName}</span>
                  <span className="text-[13px] text-cd-muted-2">
                    {catName} · {formatDateShort(tx.transaction_date, timezone)}
                  </span>
                </div>
                <span className={`whitespace-nowrap text-[15px] font-bold tabular-nums ${income ? 'text-cd-primary' : 'text-cd-expense'}`}>
                  {income ? '+' : '−'}{formatIDR(tx.amount)}
                </span>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center gap-1.5 border-t border-cd-line-soft px-6 py-8 text-center">
            <span className="text-[15px] font-bold">Belum ada transaksi</span>
            <span className="text-sm text-cd-muted-2">
              Coba kirim{' '}
              <code className="rounded-md bg-cd-tint px-1.5 py-0.5 font-mono text-[13px] text-cd-primary-hover">beli kopi 25rb</code>{' '}
              ke bot.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, note, valueClass }: { label: string; value: string; note: string; valueClass: string }) {
  return (
    <div className={`${CARD} flex flex-col gap-2.5 p-[22px]`}>
      <span className="text-xs font-bold tracking-[.07em] text-cd-muted-2">{label}</span>
      <span className={`truncate text-[28px] font-extrabold tracking-[-.02em] tabular-nums ${valueClass}`}>{value}</span>
      <span className="text-[13px] text-cd-muted-2">{note}</span>
    </div>
  )
}
