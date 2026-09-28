'use client'

import Image from 'next/image'
import { ArrowUp, Check } from 'lucide-react'
import { BOT_USERNAME } from '@/lib/constants'
import { useChatLoop } from './hero-chat'

/**
 * Versi gelap dari animasi chat hero, untuk panel kiri halaman auth:
 * jendela chat Telegram (header bot, area chat, kolom ketik) di atas panel gelap.
 */
export function AuthChat() {
  const { shown, typing } = useChatLoop()

  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-[22px] border border-cd-dark-line bg-cd-dark-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,.7)]">
      <div className="flex items-center gap-3 border-b border-cd-dark-line px-4 py-3">
        <Image src="/logo.png" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-full" />
        <div className="flex flex-col gap-px">
          <span className="text-sm font-bold">Catetin Duit</span>
          <span className="text-xs text-cd-on-dark-3">@{BOT_USERNAME} · bot</span>
        </div>
      </div>

      <div
        className="flex h-[300px] flex-col justify-end gap-2 overflow-hidden bg-[#0A1B12] p-3.5 [mask-image:linear-gradient(to_bottom,transparent,#000_16%)]"
        aria-label="Contoh percakapan dengan bot"
      >
        {shown.map((m, i) =>
          'u' in m ? (
            <span
              key={i}
              className="animate-cd-in max-w-[78%] self-end rounded-[18px_18px_4px_18px] bg-cd-primary px-3.5 py-2.5 text-[15px]"
            >
              {m.u}
            </span>
          ) : 'rows' in m ? (
            <div
              key={i}
              className="animate-cd-in flex w-[82%] flex-col gap-1.5 self-start rounded-[18px_18px_18px_4px] bg-[#16301F] px-3.5 py-2.5"
            >
              <span className="text-xs font-bold text-cd-accent-text">{m.title}</span>
              {m.rows.map((r) => (
                <span key={r.desc} className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate text-cd-on-dark">{r.desc}</span>
                  <span className={`shrink-0 font-bold ${r.tone === 'out' ? 'text-[#FF8A8A]' : 'text-white'}`}>{r.amount}</span>
                </span>
              ))}
            </div>
          ) : (
            <div
              key={i}
              className="animate-cd-in flex max-w-[82%] flex-col gap-0.5 self-start rounded-[18px_18px_18px_4px] bg-[#16301F] px-3.5 py-2.5"
            >
              <span className="flex items-center gap-1 text-xs font-bold text-cd-accent-text">
                <Check className="h-3 w-3" strokeWidth={3} /> {m.title}
              </span>
              <span className={`text-base font-bold ${m.tone === 'out' ? 'text-[#FF8A8A]' : 'text-white'}`}>{m.amount}</span>
              <span className="text-xs text-cd-on-dark-3">{m.meta}</span>
            </div>
          ),
        )}
        {typing && (
          <div className="flex gap-1 self-start rounded-[18px_18px_18px_4px] bg-[#16301F] px-3.5 py-3" aria-hidden>
            {[0, 150, 300].map((d) => (
              <span key={d} className="animate-cd-dot h-1.5 w-1.5 rounded-full bg-cd-on-dark-3" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-cd-dark-line px-3.5 py-3" aria-hidden>
        <div className="flex-1 rounded-full bg-cd-dark px-3.5 py-2.5 text-sm text-cd-on-dark-3">Tulis pesan…</div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-cd-primary text-white">
          <ArrowUp className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
