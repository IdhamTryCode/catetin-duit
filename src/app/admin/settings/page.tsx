import { FREE_PROMO, TRIAL_DURATION_DAYS } from '@/lib/constants'
import { getSettings, isPromoActive } from '@/lib/settings'
import { PageHeader } from '@/components/dashboard/ui'
import { SettingsForm } from './settings-form'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const s = await getSettings()

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <PageHeader title="Pengaturan" subtitle="Berlaku langsung untuk web, bot, dan cron — tanpa redeploy" />

      {!s.tableReady && (
        <div className="rounded-[14px] border border-[#F2DDB0] bg-[#FFF8EB] px-[18px] py-3.5 text-sm text-[#6B5A36]">
          <strong className="text-[#6B4A0E]">Tabel pengaturan belum dibuat.</strong> Jalankan{' '}
          <code className="font-mono">supabase/migrations/20260928_app_settings.sql</code> di Supabase → SQL Editor.
          Sampai itu, aplikasi memakai nilai default di bawah dan perubahan tidak bisa disimpan.
        </div>
      )}
      {FREE_PROMO && (
        <div className="rounded-[14px] border border-[#F2DDB0] bg-[#FFF8EB] px-[18px] py-3.5 text-sm text-[#6B5A36]">
          Env <code className="font-mono">NEXT_PUBLIC_FREE_PROMO=true</code> di Vercel sedang aktif dan selalu menang.
          Ubah jadi <code className="font-mono">false</code> + redeploy supaya saklar promo di bawah yang mengatur.
        </div>
      )}

      <SettingsForm
        initial={{
          promoEnabled: s.promo.enabled,
          promoUntil: s.promo.until,
          premiumPrice: s.premiumPrice,
          graceDays: s.graceDays,
        }}
        promoActiveNow={isPromoActive(s)}
        disabled={!s.tableReady}
      />

      <p className="m-0 text-[13px] text-cd-muted-2">
        Lama trial ({TRIAL_DURATION_DAYS} hari) diatur di database saat user mendaftar dan belum bisa diubah dari sini.
        Untuk user tertentu, gunakan &ldquo;Perpanjang trial&rdquo; di halaman detail user.
      </p>
    </div>
  )
}
