import { createAdminClient } from '@/utils/supabase/admin'
import { PageHeader } from '@/components/dashboard/ui'
import { BroadcastForm } from './broadcast-form'

// Pengiriman berurutan (Resend free: 2 email/detik) bisa lebih lama dari default 10 detik.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export default async function AdminBroadcastPage() {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('subscription_status, telegram_chat_id')
    .is('deleted_at', null)

  const rows = data ?? []
  const count = (statuses: string[] | null) => {
    const r = statuses ? rows.filter((u) => statuses.includes(u.subscription_status)) : rows
    return { total: r.length, telegram: r.filter((u) => u.telegram_chat_id).length }
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <PageHeader title="Broadcast" subtitle="Kirim pengumuman ke user lewat bot Telegram dan/atau email" />
      <BroadcastForm
        counts={{
          all: count(null),
          trial: count(['trial']),
          premium: count(['premium', 'grace_period']),
          expired: count(['trial_expired', 'cancelled']),
        }}
      />
    </div>
  )
}
