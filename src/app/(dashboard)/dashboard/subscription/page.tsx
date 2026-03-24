import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Crown, MessageCircle, Clock, Zap, Sparkles } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { PLAN_LIMITS, PLAN_PRICES, type Plan } from '@/lib/constants'

// ─── Feature list per plan ─────────────────────────────────────────────────────
// Tandai `soon: true` untuk fitur yang belum diimplementasikan

type Feature = { label: string; soon?: true }

const PLAN_FEATURES: Record<Plan, Feature[]> = {
  free: [
    { label: '5 transaksi per hari' },
    { label: 'Riwayat 30 hari' },
    { label: 'Catat via Telegram' },
    { label: 'Dashboard web & grafik cashflow' },
  ],
  starter: [
    { label: '20 transaksi per hari' },
    { label: 'Riwayat 6 bulan' },
    { label: 'Catat via Telegram' },
    { label: 'Dashboard web & grafik cashflow' },
    { label: 'Export laporan CSV', soon: true },
    { label: '5 kategori kustom', soon: true },
  ],
  premium: [
    { label: 'Transaksi tak terbatas' },
    { label: 'Riwayat tak terbatas' },
    { label: 'Catat via Telegram' },
    { label: 'Dashboard web & grafik cashflow' },
    { label: 'Export laporan CSV & Excel', soon: true },
    { label: 'Kategori kustom tak terbatas', soon: true },
    { label: 'Laporan bulanan via email', soon: true },
    { label: 'Analitik per kategori', soon: true },
    { label: 'Budget & anggaran bulanan', soon: true },
    { label: 'Priority support' },
  ],
}

const PLAN_META: Record<Plan, {
  name: string
  description: string
  icon: React.ReactNode
  highlight: boolean
  badge?: string
}> = {
  free: {
    name: 'Free',
    description: 'Mulai mencatat keuangan',
    icon: <Clock className="h-5 w-5 text-muted-foreground" />,
    highlight: false,
  },
  starter: {
    name: 'Starter',
    description: 'Untuk pengguna aktif sehari-hari',
    icon: <Zap className="h-5 w-5 text-primary" />,
    highlight: false,
    badge: 'Populer',
  },
  premium: {
    name: 'Premium',
    description: 'Untuk bisnis & freelancer',
    icon: <Sparkles className="h-5 w-5 text-yellow-500" />,
    highlight: true,
    badge: 'Terbaik',
  },
}

const WA_NUMBER = '6281329064923'

function buildWaLink(plan: Plan): string {
  const name = PLAN_META[plan].name
  const price = PLAN_PRICES[plan].toLocaleString('id-ID')
  const msg = `Halo CatetinDuit, aku mau berlangganan plan ${name} (Rp ${price}/bulan). Boleh dibantu proses pembayarannya?`
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_status, trial_ends_at, subscription_ends_at, timezone')
    .eq('id', user!.id)
    .single()

  const timezone    = profile?.timezone ?? 'Asia/Jakarta'
  const currentPlan = (profile?.plan ?? 'free') as Plan
  const status      = profile?.subscription_status ?? 'trial'

  const statusLabel: Record<string, string> = {
    trial:         `Trial berakhir ${profile?.trial_ends_at ? formatInTimeZone(new Date(profile.trial_ends_at), timezone, 'dd MMM yyyy') : '-'}`,
    premium:       `Aktif hingga ${profile?.subscription_ends_at ? formatInTimeZone(new Date(profile.subscription_ends_at), timezone, 'dd MMM yyyy') : '-'}`,
    trial_expired: 'Trial sudah berakhir',
    grace_period:  'Masa tenggang — segera perpanjang',
    cancelled:     'Langganan dibatalkan',
  }

  const plans: Plan[] = ['free', 'starter', 'premium']

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Langganan</h1>
        <p className="text-muted-foreground">Pilih plan yang sesuai kebutuhanmu</p>
      </div>

      {/* Current plan banner */}
      <Card className="bg-muted/40">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-sm">Plan kamu saat ini</span>
            </div>
            <Badge variant={currentPlan === 'premium' ? 'default' : currentPlan === 'starter' ? 'outline' : 'secondary'}>
              {PLAN_META[currentPlan].name}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{statusLabel[status] ?? ''}</p>
        </CardHeader>
      </Card>

      {/* Coming soon notice */}
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
        <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Payment gateway sedang dalam proses aktivasi. Sementara ini, upgrade dapat dilakukan langsung via WhatsApp — tim kami akan membantu proses pembayaran dan aktivasi.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const meta      = PLAN_META[plan]
          const price     = PLAN_PRICES[plan]
          const features  = PLAN_FEATURES[plan]
          const isCurrent = plan === currentPlan
          const isPaid    = price > 0

          return (
            <div key={plan} className="relative pt-4 flex flex-col">
              {/* Badge di luar Card agar tidak terpotong overflow */}
              {meta.badge && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                  <Badge
                    className={`shadow-sm px-3 ${meta.highlight ? 'bg-primary text-primary-foreground' : ''}`}
                    variant={meta.highlight ? 'default' : 'secondary'}
                  >
                    {meta.badge}
                  </Badge>
                </div>
              )}
            <Card
              className={`flex flex-col flex-1 transition-all ${
                meta.highlight
                  ? 'border-primary ring-1 ring-primary shadow-md'
                  : ''
              }`}
            >

              <CardHeader className="pb-3 pt-6">
                <div className="flex items-center gap-2 mb-1">
                  {meta.icon}
                  <CardTitle className="text-base">{meta.name}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
                <div className="mt-3">
                  {price === 0 ? (
                    <span className="text-2xl font-bold">Gratis</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">
                        Rp {price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-muted-foreground mb-1">/bln</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-4 pb-5">
                {/* Feature list */}
                <ul className="space-y-1.5 flex-1">
                  {features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${f.soon ? 'text-muted-foreground/50' : 'text-green-500'}`} />
                      <span className={f.soon ? 'text-muted-foreground' : ''}>
                        {f.label}
                        {f.soon && (
                          <span className="ml-1 text-[10px] font-medium text-primary/70 bg-primary/10 rounded px-1 py-0.5 align-middle">
                            soon
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Plan Aktif
                  </Button>
                ) : isPaid ? (
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <a href={buildWaLink(plan)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      Upgrade via WhatsApp
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
            </div>
          )
        })}
      </div>

      {/* Limit summary bar */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Batas transaksi harian</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {plans.map((plan) => (
              <div
                key={plan}
                className={`rounded-lg p-2 ${plan === currentPlan ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-background'}`}
              >
                <p className="text-[10px] text-muted-foreground">{PLAN_META[plan].name}</p>
                <p className="text-sm font-bold mt-0.5">
                  {PLAN_LIMITS[plan].dailyTransactions === Infinity ? '∞' : PLAN_LIMITS[plan].dailyTransactions}
                </p>
                <p className="text-[10px] text-muted-foreground">tx/hari</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
