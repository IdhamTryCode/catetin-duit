'use client'

import { Check } from 'lucide-react'
import { useChatLoop } from './hero-chat'

/** Versi gelap dari animasi chat hero, untuk panel kiri halaman auth. */
export function AuthChat() {
  const { shown, typing } = useChatLoop()

  return (
    <div
      className="flex h-[340px] flex-col justify-end gap-2 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_22%)]"
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
            className="animate-cd-in flex w-[82%] flex-col gap-1.5 self-start rounded-[18px_18px_18px_4px] bg-cd-dark-2 px-3.5 py-2.5"
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
            className="animate-cd-in flex max-w-[82%] flex-col gap-0.5 self-start rounded-[18px_18px_18px_4px] bg-cd-dark-2 px-3.5 py-2.5"
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
        <div className="flex gap-1 self-start rounded-[18px_18px_18px_4px] bg-cd-dark-2 px-3.5 py-3" aria-hidden>
          {[0, 150, 300].map((d) => (
            <span key={d} className="animate-cd-dot h-1.5 w-1.5 rounded-full bg-cd-on-dark-3" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      )}
    </div>
  )
}
