'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { BTN_PRIMARY, CARD } from '@/components/dashboard/ui'
import { FIELD, LABEL } from '@/components/dashboard/modal'
import { adminBroadcast } from '../actions'

type Audience = 'all' | 'trial' | 'premium' | 'expired'
type Counts = Record<Audience, { total: number; telegram: number }>

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'Semua user',
  trial: 'Trial',
  premium: 'Premium (termasuk masa tenggang)',
  expired: 'Sudah berakhir (trial/langganan)',
}

export function BroadcastForm({ counts }: { counts: Counts }) {
  const [pending, start] = useTransition()
  const [audience, setAudience] = useState<Audience>('all')
  const [telegram, setTelegram] = useState(true)
  const [email, setEmail] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const c = counts[audience]
  const recipients = [telegram && `${c.telegram} via Telegram`, email && `${c.total} via email`].filter(Boolean).join(' + ')

  function send(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm(`Kirim pengumuman ke ${AUDIENCE_LABEL[audience]} (${recipients})? Tidak bisa dibatalkan.`)) return
    setResult(null)
    start(async () => {
      const res = await adminBroadcast({ audience, telegram, email, subject, message })
      if (res.error) {
        toast.error(res.error)
        return
      }
      const summary = `Terkirim: ${res.sentTelegram} Telegram, ${res.sentEmail} email${res.failed ? `, ${res.failed} gagal` : ''}.`
      setResult(summary)
      toast.success(summary)
    })
  }

  return (
    <form onSubmit={send} className={`${CARD} flex flex-col gap-4 p-5`}>
      <label className={LABEL}>
        Kirim ke
        <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className={`${FIELD} font-normal`}>
          {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
            <option key={a} value={a}>{AUDIENCE_LABEL[a]} — {counts[a].total} user</option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={telegram} onChange={(e) => setTelegram(e.target.checked)} className="h-4 w-4 accent-[#00754A]" />
          Bot Telegram ({c.telegram} terhubung)
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4 accent-[#00754A]" />
          Email ({c.total})
        </label>
      </div>

      {email && (
        <label className={LABEL}>
          Subjek email
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="Fitur baru di Catetin Duit" className={`${FIELD} font-normal`} />
        </label>
      )}

      <label className={LABEL}>
        Pesan
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={3500}
          placeholder="Halo! Sekarang kamu bisa…"
          className={`${FIELD} resize-y font-normal`}
        />
        <span className="text-xs font-normal text-cd-muted-2">Teks polos. Di email, baris baru dipertahankan dan ada tombol ke dashboard.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || (!telegram && !email) || !message.trim()} className={BTN_PRIMARY}>
          {pending ? 'Mengirim…' : 'Kirim pengumuman'}
        </button>
        {recipients && <span className="text-[13px] text-cd-muted-2">Penerima: {recipients}</span>}
      </div>
      {result && <p className="m-0 rounded-xl bg-cd-tint px-3.5 py-2.5 text-sm font-semibold text-cd-primary-hover">{result}</p>}
    </form>
  )
}
