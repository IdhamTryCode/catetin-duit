import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/dashboard/ui'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, timezone, telegram_chat_id')
    .eq('id', user!.id)
    .single()

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <PageHeader title="Pengaturan" subtitle="Kelola profil dan preferensi kamu" />
      <SettingsForm
        initialValues={{
          full_name: profile?.full_name ?? '',
          timezone: profile?.timezone ?? 'Asia/Jakarta',
          telegram_chat_id: profile?.telegram_chat_id ?? null,
        }}
        email={profile?.email ?? ''}
      />
    </div>
  )
}
