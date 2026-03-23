import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola profil dan preferensi kamu</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Informasi akun kamu</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initialValues={{
              full_name: profile?.full_name ?? '',
              timezone: profile?.timezone ?? 'Asia/Jakarta',
              telegram_chat_id: profile?.telegram_chat_id ?? null,
            }}
            email={profile?.email ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  )
}
