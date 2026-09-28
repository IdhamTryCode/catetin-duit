'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/utils'
import { CARD, BTN_PRIMARY, BTN_SECONDARY } from '@/components/dashboard/ui'
import { FIELD, LABEL } from '@/components/dashboard/modal'
import {
  adminDisconnectTelegram,
  adminExtendTrial,
  adminRecordPayment,
  adminResetConnectCodes,
  adminSetPremiumUntil,
  adminUpdateUserRole,
  adminUpdateUserStatus,
} from '../../actions'

interface Props {
  user: { id: string; email: string; role: string; status: string; telegramConnected: boolean }
  isSelf: boolean
  premiumPrice: number
}

const METHODS = ['Transfer bank', 'QRIS', 'E-wallet', 'Lainnya']

export function UserActions({ user, isSelf, premiumPrice }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  // Form pembayaran
  const [months, setMonths] = useState(1)
  const [amount, setAmount] = useState(String(premiumPrice))
  const [method, setMethod] = useState(METHODS[0])
  const [note, setNote] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  // Form lain
  const [trialDays, setTrialDays] = useState('7')
  const [premiumUntil, setPremiumUntil] = useState('')
  const [status, setStatus] = useState(user.status)

  function run(label: string, fn: () => Promise<{ error?: string } & Record<string, unknown>>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return
    start(async () => {
      const res = await fn()
      if (res?.error) toast.error(res.error)
      else {
        toast.success(label)
        router.refresh()
      }
    })
  }

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
      {/* Pembayaran manual */}
      <section className={`${CARD} flex flex-col gap-4 p-5`}>
        <div>
          <h2 className="m-0 text-base font-bold">Catat pembayaran & aktifkan Premium</h2>
          <p className="m-0 text-[13px] text-cd-muted-2">Untuk pembayaran lewat WhatsApp/transfer. Premium diperpanjang dari tanggal berjalan.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            Durasi
            <select
              value={months}
              onChange={(e) => {
                const m = Number(e.target.value)
                setMonths(m)
                setAmount(String(premiumPrice * m))
              }}
              className={`${FIELD} font-normal`}
            >
              {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} bulan</option>)}
            </select>
          </label>
          <label className={LABEL}>
            Nominal (Rp)
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${FIELD} font-normal`} />
          </label>
          <label className={LABEL}>
            Metode
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${FIELD} font-normal`}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className={LABEL}>
            Catatan
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. BCA a.n. Budi" className={`${FIELD} font-normal`} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="accent-[#00754A]" />
          Kirim email konfirmasi pembayaran ke {user.email}
        </label>
        <button
          type="button"
          disabled={pending}
          className={`${BTN_PRIMARY} justify-center`}
          onClick={() =>
            run('Pembayaran tercatat, Premium aktif', () =>
              adminRecordPayment({ userId: user.id, months, amount: Number(amount), method, note, sendEmail }),
              `Catat pembayaran ${formatIDR(Number(amount))} dan aktifkan Premium ${months} bulan?`)
          }
        >
          Catat & aktifkan Premium
        </button>
      </section>

      {/* Langganan */}
      <section className={`${CARD} flex flex-col gap-4 p-5`}>
        <h2 className="m-0 text-base font-bold">Atur langganan</h2>

        <div className="flex items-end gap-2">
          <label className={`${LABEL} flex-1`}>
            Perpanjang trial (hari)
            <input value={trialDays} onChange={(e) => setTrialDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${FIELD} font-normal`} />
          </label>
          <button type="button" disabled={pending} className={BTN_SECONDARY}
            onClick={() => run('Trial diperpanjang', () => adminExtendTrial(user.id, Number(trialDays)))}>
            Perpanjang
          </button>
        </div>

        <div className="flex items-end gap-2">
          <label className={`${LABEL} flex-1`}>
            Premium sampai tanggal (tanpa catat bayar)
            <input type="date" value={premiumUntil} onChange={(e) => setPremiumUntil(e.target.value)} className={`${FIELD} font-normal`} />
          </label>
          <button type="button" disabled={pending || !premiumUntil} className={BTN_SECONDARY}
            onClick={() => run('Premium diatur', () => adminSetPremiumUntil(user.id, premiumUntil))}>
            Simpan
          </button>
        </div>

        <div className="flex items-end gap-2">
          <label className={`${LABEL} flex-1`}>
            Ubah status langsung
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${FIELD} font-normal`}>
              <option value="trial">Trial</option>
              <option value="premium">Premium (+30 hari)</option>
              <option value="grace_period">Masa tenggang</option>
              <option value="trial_expired">Trial berakhir</option>
              <option value="cancelled">Langganan berakhir</option>
            </select>
          </label>
          <button type="button" disabled={pending} className={BTN_SECONDARY}
            onClick={() => {
              const fd = new FormData()
              fd.append('user_id', user.id)
              fd.append('status', status)
              run('Status diubah', () => adminUpdateUserStatus(fd))
            }}>
            Terapkan
          </button>
        </div>
      </section>

      {/* Telegram & akses */}
      <section className={`${CARD} flex flex-col gap-3 p-5`}>
        <h2 className="m-0 text-base font-bold">Telegram & akses</h2>
        <div className="flex flex-wrap gap-2">
          {user.telegramConnected && (
            <button type="button" disabled={pending} className={`${BTN_SECONDARY} text-cd-expense`}
              onClick={() => run('Telegram diputus', () => adminDisconnectTelegram(user.id), 'Putuskan koneksi Telegram user ini?')}>
              Putuskan Telegram
            </button>
          )}
          <button type="button" disabled={pending} className={BTN_SECONDARY}
            onClick={() => run('Kode connect direset', () => adminResetConnectCodes(user.id), 'Hapus semua kode connect user ini? (membuka kunci & mereset batas 3 kode/jam)')}>
            Reset kode connect
          </button>
          <button type="button" disabled={pending || isSelf} className={BTN_SECONDARY}
            title={isSelf ? 'Tidak bisa mengubah role sendiri' : undefined}
            onClick={() => {
              const fd = new FormData()
              fd.append('user_id', user.id)
              fd.append('role', user.role === 'admin' ? 'user' : 'admin')
              run('Role diubah', () => adminUpdateUserRole(fd),
                user.role === 'admin' ? 'Cabut akses admin user ini?' : 'Jadikan user ini admin? Admin bisa mengubah semua data.')
            }}>
            {user.role === 'admin' ? 'Cabut admin' : 'Jadikan admin'}
          </button>
        </div>
        <p className="m-0 text-[13px] text-cd-muted-2">Semua aksi di halaman ini tercatat di riwayat aksi admin.</p>
      </section>
    </div>
  )
}
