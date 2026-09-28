'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowUp, Check } from 'lucide-react'
import { BOT_USERNAME } from '@/lib/constants'
import { formatIDR } from '@/lib/utils'

type ScriptItem =
  | { u: string }
  | { title: string; amount: string; meta: string; tone: 'out' | 'in'; out?: number; inc?: number }

const SCRIPT: ScriptItem[] = [
  { u: 'beli kopi 25rb' },
  { title: 'Tercatat! Pengeluaran', amount: `-${formatIDR(25_000)}`, meta: 'Makanan & Minuman', tone: 'out', out: 25_000 },
  { u: 'bensin motor 30rb' },
  { title: 'Tercatat! Pengeluaran', amount: `-${formatIDR(30_000)}`, meta: 'Transportasi', tone: 'out', out: 30_000 },
  { u: 'terima transfer dari client 2jt' },
  { title: 'Tercatat! Pemasukan', amount: `+${formatIDR(2_000_000)}`, meta: 'Pemasukan Lain', tone: 'in', inc: 2_000_000 },
  { u: '/ringkasan' },
  { title: 'Ringkasan bulan ini', amount: `Net +${formatIDR(1_945_000)}`, meta: `Masuk ${formatIDR(2_000_000)} · Keluar ${formatIDR(55_000)}`, tone: 'in' },
]

/** 8 pesan + jeda, lalu ulang dari awal. */
const LAST_TICK = 11
const TICK_MS = 1400

export function HeroChat() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(SCRIPT.length)
      return
    }
    const t = setInterval(() => setStep((s) => (s >= LAST_TICK ? 0 : s + 1)), TICK_MS)
    return () => clearInterval(t)
  }, [])

  const shown = SCRIPT.slice(0, Math.min(step, SCRIPT.length))
  const next = SCRIPT[shown.length]
  const typing = !!next && !('u' in next)
  const totalIn = shown.reduce((a, m) => a + ('inc' in m ? m.inc ?? 0 : 0), 0)
  const totalOut = shown.reduce((a, m) => a + ('out' in m ? m.out ?? 0 : 0), 0)

  return (
    <div className="relative flex justify-center">
      <div className="w-full max-w-[400px] overflow-hidden rounded-[28px] border border-cd-line bg-white shadow-[0_40px_80px_-40px_rgba(6,20,13,.35),0_2px_6px_rgba(6,20,13,.05)]">
        <div className="flex items-center gap-3 border-b border-cd-line-soft px-[18px] py-3.5">
          <Image src="/logo.png" alt="" width={38} height={38} className="h-[38px] w-[38px] rounded-full" />
          <div className="flex flex-col gap-px">
            <span className="text-[15px] font-bold">Catetin Duit</span>
            <span className="text-xs text-cd-muted-2">@{BOT_USERNAME} · bot</span>
          </div>
        </div>

        <div
          className="flex h-[430px] flex-col justify-end gap-2 overflow-hidden bg-cd-chat p-4"
          aria-label="Contoh percakapan dengan bot"
        >
          {shown.map((m, i) =>
            'u' in m ? (
              <div
                key={i}
                className="animate-cd-in max-w-[78%] self-end rounded-[18px_18px_4px_18px] bg-cd-primary px-3.5 py-2.5 text-[15px] font-medium text-white"
              >
                {m.u}
              </div>
            ) : (
              <div
                key={i}
                className="animate-cd-in flex max-w-[82%] flex-col gap-0.5 self-start rounded-[18px_18px_18px_4px] bg-white px-3.5 py-2.5 shadow-[0_1px_1px_rgba(6,20,13,.06)]"
              >
                <span className="flex items-center gap-1 text-xs font-bold text-cd-success">
                  <Check className="h-3 w-3" strokeWidth={3} /> {m.title}
                </span>
                <span className={`text-[17px] font-bold tracking-[-.01em] ${m.tone === 'out' ? 'text-cd-expense' : 'text-cd-primary'}`}>
                  {m.amount}
                </span>
                <span className="text-xs text-cd-muted-2">{m.meta}</span>
              </div>
            ),
          )}
          {typing && (
            <div className="flex gap-1 self-start rounded-[18px_18px_18px_4px] bg-white px-3.5 py-3" aria-hidden>
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="animate-cd-dot h-1.5 w-1.5 rounded-full bg-cd-muted-2"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-t border-cd-line-soft px-3.5 py-3" aria-hidden>
          <div className="flex-1 rounded-full bg-cd-bg px-3.5 py-2.5 text-sm text-cd-placeholder">Tulis pesan…</div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-cd-primary text-white">
            <ArrowUp className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-9 left-0 flex gap-5 rounded-2xl bg-cd-dark px-4 py-3.5 text-white shadow-[0_20px_40px_-16px_rgba(6,20,13,.5)] sm:-left-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold tracking-[.06em] text-cd-on-dark-3">MASUK HARI INI</span>
          <span className="text-base font-bold text-cd-accent-text">{formatIDR(totalIn)}</span>
        </div>
        <div className="w-px bg-cd-dark-line" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold tracking-[.06em] text-cd-on-dark-3">KELUAR HARI INI</span>
          <span className="text-base font-bold text-[#FF8A8A]">{formatIDR(totalOut)}</span>
        </div>
      </div>
    </div>
  )
}
