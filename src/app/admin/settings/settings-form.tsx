'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BTN_PRIMARY, CARD } from '@/components/dashboard/ui'
import { FIELD, LABEL } from '@/components/dashboard/modal'
import { adminUpdateSettings } from '../actions'

interface Props {
  initial: { promoEnabled: boolean; promoUntil: string | null; premiumPrice: number; graceDays: number }
  promoActiveNow: boolean
  disabled: boolean
}

export function SettingsForm({ initial, promoActiveNow, disabled }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [promoEnabled, setPromoEnabled] = useState(initial.promoEnabled)
  const [promoUntil, setPromoUntil] = useState(initial.promoUntil ?? '')
  const [price, setPrice] = useState(String(initial.premiumPrice))
  const [grace, setGrace] = useState(String(initial.graceDays))

  function save(e: React.FormEvent) {
    e.preventDefault()
    const turningOff = initial.promoEnabled && !promoEnabled
    if (turningOff && !confirm('Matikan promo? User dengan trial yang sudah lewat akan diblokir bot dan dikirimi email di run cron berikutnya.')) return
    start(async () => {
      const res = await adminUpdateSettings({
        promoEnabled,
        promoUntil: promoUntil || null,
        premiumPrice: Number(price),
        graceDays: Number(grace),
      })
      if (res.error) toast.error(res.error)
      else {
        toast.success('Pengaturan disimpan')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-col gap-4 p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-bold">Promo gratis</h2>
            <p className="m-0 text-[13px] text-cd-muted-2">Semua user mendapat akses penuh, bot tidak memblokir, email trial tidak dikirim.</p>
          </div>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${promoActiveNow ? 'bg-cd-accent text-cd-dark' : 'bg-cd-bg text-cd-muted-2'}`}>
            {promoActiveNow ? 'Sedang aktif' : 'Tidak aktif'}
          </span>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
          <input type="checkbox" checked={promoEnabled} onChange={(e) => setPromoEnabled(e.target.checked)} disabled={disabled} className="h-4 w-4 accent-[#00754A]" />
          Aktifkan promo
        </label>
        <label className={LABEL}>
          Berakhir otomatis setelah tanggal (opsional)
          <input type="date" value={promoUntil} onChange={(e) => setPromoUntil(e.target.value)} disabled={disabled || !promoEnabled} className={`${FIELD} max-w-[220px] font-normal`} />
          <span className="text-xs font-normal text-cd-muted-2">Kosongkan = promo jalan terus sampai dimatikan. Tanggal berlaku sampai 23:59 WIB.</span>
        </label>
      </section>

      <section className={`${CARD} grid gap-4 p-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]`}>
        <label className={LABEL}>
          Harga Premium per bulan (Rp)
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} inputMode="numeric" disabled={disabled} className={`${FIELD} font-normal`} />
          <span className="text-xs font-normal text-cd-muted-2">Tampil di landing, halaman Langganan, email, dan link WhatsApp.</span>
        </label>
        <label className={LABEL}>
          Masa tenggang setelah Premium habis (hari)
          <input value={grace} onChange={(e) => setGrace(e.target.value.replace(/\D/g, ''))} inputMode="numeric" disabled={disabled} className={`${FIELD} font-normal`} />
          <span className="text-xs font-normal text-cd-muted-2">Selama masa ini akses masih penuh, lalu status jadi &ldquo;Langganan berakhir&rdquo;.</span>
        </label>
      </section>

      <div>
        <button type="submit" disabled={pending || disabled} className={BTN_PRIMARY}>
          {pending ? 'Menyimpan…' : 'Simpan pengaturan'}
        </button>
      </div>
    </form>
  )
}
