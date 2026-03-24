import { createAdminClient } from '@/utils/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ArrowLeftRight, TrendingUp, Crown } from 'lucide-react'
import { PLAN_NAMES, PLAN_PRICES, type Plan } from '@/lib/constants'
import { formatIDR } from '@/lib/utils'

async function getStats() {
  const supabase = createAdminClient()

  const [
    { count: totalUsers },
    { data: planCounts },
    { count: totalTransactions },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('profiles').select('plan').is('deleted_at', null),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('profiles')
      .select('id, full_name, email, plan, subscription_status, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Aggregate plan distribution
  const byPlan: Record<Plan, number> = { free: 0, starter: 0, premium: 0 }
  for (const p of planCounts ?? []) {
    const plan = p.plan as Plan
    if (plan in byPlan) byPlan[plan]++
  }

  // Estimated MRR (monthly recurring revenue)
  const mrr = byPlan.starter * PLAN_PRICES.starter + byPlan.premium * PLAN_PRICES.premium

  return { totalUsers: totalUsers ?? 0, totalTransactions: totalTransactions ?? 0, byPlan, mrr, recentUsers: recentUsers ?? [] }
}

export default async function AdminPage() {
  const { totalUsers, totalTransactions, byPlan, mrr, recentUsers } = await getStats()

  const planOrder: Plan[] = ['free', 'starter', 'premium']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm">Ringkasan data Catetin Duit</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total User</span>
            </div>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Transaksi</span>
            </div>
            <p className="text-2xl font-bold">{totalTransactions.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Berbayar</span>
            </div>
            <p className="text-2xl font-bold">{byPlan.starter + byPlan.premium}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Est. MRR</span>
            </div>
            <p className="text-2xl font-bold">{formatIDR(mrr)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Distribusi Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {planOrder.map((plan) => {
              const count = byPlan[plan]
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{PLAN_NAMES[plan]}</span>
                    <span className="text-muted-foreground">{count} user ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${plan === 'premium' ? 'bg-primary' : plan === 'starter' ? 'bg-blue-400' : 'bg-muted-foreground/30'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">User Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentUsers.map((u, i) => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < recentUsers.length - 1 ? 'border-b' : ''}`}>
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {(u.full_name ?? u.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{u.full_name ?? u.email}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${u.plan === 'premium' ? 'bg-primary/10 text-primary' : u.plan === 'starter' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                  {PLAN_NAMES[u.plan as Plan] ?? u.plan}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
