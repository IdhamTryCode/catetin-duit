import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, Crown, Zap } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'

const FEATURES = [
  'Pencatatan via Telegram tanpa batas',
  'Dashboard web interaktif',
  'Grafik cashflow bulanan',
  'Riwayat transaksi lengkap',
  'Backup data otomatis',
]

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, subscription_ends_at, timezone')
    .eq('id', user!.id)
    .single()

  const timezone = profile?.timezone ?? 'Asia/Jakarta'
  const status = profile?.subscription_status ?? 'trial'

  const statusConfig: Record<string, { label: string; color: string; description: string }> = {
    trial: {
      label: 'Trial',
      color: 'bg-blue-500',
      description: `Trial berakhir ${profile?.trial_ends_at ? formatInTimeZone(new Date(profile.trial_ends_at), timezone, 'dd MMM yyyy') : '-'}`,
    },
    premium: {
      label: 'Premium',
      color: 'bg-green-500',
      description: `Aktif hingga ${profile?.subscription_ends_at ? formatInTimeZone(new Date(profile.subscription_ends_at), timezone, 'dd MMM yyyy') : '-'}`,
    },
    trial_expired: {
      label: 'Trial Expired',
      color: 'bg-red-500',
      description: 'Trial kamu sudah berakhir. Upgrade untuk terus menggunakan.',
    },
    grace_period: {
      label: 'Grace Period',
      color: 'bg-yellow-500',
      description: 'Langganan berakhir. Masih ada waktu untuk perpanjang.',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-gray-500',
      description: 'Langganan dibatalkan.',
    },
  }

  const currentStatus = statusConfig[status] ?? statusConfig['trial']
  const isPremium = status === 'premium'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Langganan</h1>
        <p className="text-muted-foreground">Kelola status langganan kamu</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-yellow-500" />
              <CardTitle>Status Saat Ini</CardTitle>
            </div>
            <Badge className={`${currentStatus.color} text-white`}>{currentStatus.label}</Badge>
          </div>
          <CardDescription>{currentStatus.description}</CardDescription>
        </CardHeader>
      </Card>

      {!isPremium && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Upgrade ke Premium</CardTitle>
                <CardDescription>Akses penuh semua fitur tanpa batas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <span className="text-4xl font-bold">Rp 29.000</span>
              <span className="text-muted-foreground">/bulan</span>
            </div>

            <ul className="space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Separator />

            <form action="/api/subscription/create" method="POST">
              <Button type="submit" className="w-full" size="lg">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Premium — Rp 29.000
              </Button>
            </form>
            <p className="text-xs text-center text-muted-foreground">
              Pembayaran aman via Duitku. Mendukung QRIS, transfer bank, dan e-wallet.
            </p>
          </CardContent>
        </Card>
      )}

      {isPremium && (
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium">Kamu sudah Premium!</p>
            <p className="text-sm text-muted-foreground">Nikmati semua fitur tanpa batas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
