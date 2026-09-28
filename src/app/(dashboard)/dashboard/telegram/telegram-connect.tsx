'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Send } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import {
  BOT_USERNAME,
  CONNECT_CODE_MAX_ATTEMPTS,
  CONNECT_CODE_MAX_PER_HOUR,
  CONNECT_CODE_TTL_MINUTES,
} from '@/lib/constants'

const BOT_URL = `https://t.me/${BOT_USERNAME}`
const POLL_MS = 3000

/** Dihitung di server (page.tsx) dari tabel connect_codes milik user. */
export type ConnectState = {
  active: { code: string; expiresAt: string } | null
  locked: boolean
  remaining: number
  retryAt: string | null
}

function secondsUntil(iso: string) {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
}

export function TelegramConnect({ userId, initial }: { userId: string; initial: ConnectState }) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [limitHit, setLimitHit] = useState(false)
  const [copied, setCopied] = useState(false)

  const { active, locked, remaining, retryAt } = initial
  const view = active ? 'kode' : locked ? 'terkunci' : remaining === 0 || limitHit ? 'batas' : 'belum'
  const busy = isLoading || isRefreshing

  const refresh = () => startTransition(() => router.refresh())

  async function generateCode() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/connect/generate', { method: 'POST' })
      if (res.status === 429) {
        setLimitHit(true)
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Gagal membuat kode. Coba lagi.')
        return
      }
      refresh()
    } finally {
      setIsLoading(false)
    }
  }

  async function copyCommand() {
    if (!active) return
    await navigator.clipboard.writeText(`/connect ${active.code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Countdown dari expires_at server; saat habis, muat ulang state dari server.
  const [secsLeft, setSecsLeft] = useState(() => (active ? secondsUntil(active.expiresAt) : 0))
  useEffect(() => {
    if (!active) return
    setSecsLeft(secondsUntil(active.expiresAt))
    const t = setInterval(() => {
      const left = secondsUntil(active.expiresAt)
      setSecsLeft(left)
      if (left === 0) {
        clearInterval(t)
        refresh()
      }
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.code, active?.expiresAt])

  // Selama kode aktif, cek apakah bot sudah menautkan akun ini.
  useEffect(() => {
    if (!active) return
    const supabase = createClient()
    const t = setInterval(async () => {
      if (document.hidden) return
      const { data } = await supabase.from('profiles').select('telegram_chat_id').eq('id', userId).single()
      if (data?.telegram_chat_id) {
        clearInterval(t)
        refresh()
      }
    }, POLL_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.code, userId])

  if (view === 'kode' && active) {
    return (
      <div className="overflow-hidden rounded-[20px] border border-cd-line bg-white">
        <div className="flex flex-col gap-[22px] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cd-line-strong border-t-cd-primary" />
              <span className="text-[13px] font-bold text-cd-primary-hover">Menunggu kamu menekan Start di bot</span>
            </div>
            <span className="font-mono text-[13px] text-cd-muted-2" suppressHydrationWarning>
              Berlaku {formatCountdown(secsLeft)}
            </span>
          </div>

          <a
            href={`${BOT_URL}?start=${active.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-[14px] bg-cd-primary p-[18px] text-[17px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(0,117,74,.7)] hover:bg-cd-primary-hover"
          >
            <Send className="h-5 w-5" />
            Hubungkan otomatis di Telegram
          </a>

          <ol className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            <Step done>Kode dibuat</Step>
            <Step n={2}>Tekan tombol di atas, lalu Start di bot</Step>
            <Step n={3}>Halaman ini otomatis berubah saat terhubung</Step>
          </ol>
        </div>

        <div className="flex flex-col gap-3 border-t border-cd-line bg-cd-bg px-5 py-[22px] sm:px-7">
          <span className="text-sm font-semibold">
            Tombol tidak membuka Telegram? Kirim manual ke <span className="text-cd-primary">@{BOT_USERNAME}</span>:
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            <code className="min-w-[200px] flex-1 rounded-xl border border-cd-line bg-white px-4 py-3 font-mono text-lg font-semibold tracking-[.04em]">
              /connect {active.code}
            </code>
            <button
              type="button"
              onClick={copyCommand}
              className="cursor-pointer rounded-xl border border-cd-line-strong bg-white px-4 py-[13px] text-sm font-semibold text-cd-ink hover:border-cd-primary"
            >
              {copied ? 'Tersalin ✓' : 'Salin'}
            </button>
          </div>
          <div className="flex flex-wrap justify-between gap-3 text-[13px] text-cd-muted-2">
            <span>
              Kode berlaku {CONNECT_CODE_TTL_MINUTES} menit. Maksimal {CONNECT_CODE_MAX_PER_HOUR} kode per jam.
            </span>
            {remaining > 0 ? (
              <button
                type="button"
                onClick={generateCode}
                disabled={busy}
                className="cursor-pointer p-0 text-[13px] font-semibold text-cd-primary disabled:opacity-50"
              >
                {busy ? 'Membuat kode…' : `Buat kode baru (${remaining} tersisa)`}
              </button>
            ) : (
              retryAt && <span suppressHydrationWarning>Kode baru bisa dibuat lagi pukul {formatClock(retryAt)}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'terkunci') {
    return (
      <div className="flex flex-col gap-2 rounded-[20px] border border-[#F0C8C8] bg-[#FDF0F0] px-7 py-6">
        <span className="text-base font-bold text-[#8A1F1F]">Kode terkunci</span>
        <p className="m-0 text-sm leading-relaxed text-[#6E3A3A]">
          Terjadi {CONNECT_CODE_MAX_ATTEMPTS} percobaan gagal, jadi kode ini tidak bisa dipakai lagi demi keamanan akunmu.{' '}
          {remaining > 0 ? (
            'Buat kode baru untuk mencoba lagi.'
          ) : (
            retryAt && <span suppressHydrationWarning>Kamu bisa membuat kode baru lagi pukul {formatClock(retryAt)}.</span>
          )}
        </p>
        {remaining > 0 && (
          <div className="flex pt-1.5">
            <button
              type="button"
              onClick={generateCode}
              disabled={busy}
              className="cursor-pointer rounded-[10px] border border-[#F0C8C8] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#8A1F1F] disabled:opacity-50"
            >
              {busy ? 'Membuat kode…' : 'Generate Kode Baru'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (view === 'batas') {
    return (
      <div className="flex flex-col gap-2 rounded-[20px] border border-[#F2DDB0] bg-[#FFF8EB] px-7 py-6">
        <span className="text-base font-bold text-[#6B4A0E]">Batas {CONNECT_CODE_MAX_PER_HOUR} kode per jam tercapai</span>
        <p className="m-0 text-sm leading-relaxed text-[#6B5A36]">
          {retryAt ? (
            <span suppressHydrationWarning>Kamu bisa membuat kode baru lagi pukul {formatClock(retryAt)}. </span>
          ) : (
            'Coba lagi dalam 1 jam. '
          )}
          Kode terakhir yang masih berlaku tetap bisa dipakai.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-cd-line bg-white p-7">
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#C9D6CE]" />
        <span className="text-[13px] font-bold text-cd-muted-2">Belum terhubung</span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-xl font-bold">Satu langkah lagi untuk mulai mencatat</h2>
        <p className="m-0 text-[15px] leading-relaxed text-cd-muted">
          Buat kode, lalu tekan Start di bot. Akunmu akan terhubung otomatis.
        </p>
      </div>
      <div className="flex">
        <button
          type="button"
          onClick={generateCode}
          disabled={busy}
          className="cursor-pointer rounded-xl bg-cd-primary px-5 py-[13px] text-[15px] font-bold text-white hover:bg-cd-primary-hover disabled:opacity-60"
        >
          {busy ? 'Membuat kode…' : 'Generate Kode'}
        </button>
      </div>
    </div>
  )
}

function Step({ n, done, children }: { n?: number; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm leading-[1.45] text-cd-ink-2">
      <span
        className={`grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full text-xs font-bold ${
          done ? 'bg-cd-primary text-white' : 'bg-cd-tint text-cd-primary'
        }`}
      >
        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
      </span>
      {children}
    </li>
  )
}
