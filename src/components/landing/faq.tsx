'use client'

import { useState } from 'react'

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0)

  return (
    <div className="flex flex-col border-t border-cd-line">
      {items.map((f, i) => {
        const isOpen = i === open
        return (
          <div key={f.q} className="border-b border-cd-line">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 py-[22px] text-left text-[17px] font-semibold text-cd-ink"
            >
              <span>{f.q}</span>
              <span className="text-[22px] font-normal text-cd-primary" aria-hidden>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <p className="m-0 pb-[22px] pr-10 text-[15px] leading-[1.65] text-cd-muted">{f.a}</p>}
          </div>
        )
      })}
    </div>
  )
}
