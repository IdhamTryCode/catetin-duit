'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

type Exchange = { u: string; t: 'Pengeluaran' | 'Pemasukan'; a: string; c: string }

const PERSONAS: { label: string; note: string; msgs: Exchange[] }[] = [
  {
    label: 'Karyawan',
    note: 'Tahu sisa gaji sampai akhir bulan tanpa buka spreadsheet.',
    msgs: [
      { u: 'makan siang 35rb', t: 'Pengeluaran', a: '-Rp 35.000', c: 'Makanan & Minuman' },
      { u: 'gajian 8jt', t: 'Pemasukan', a: '+Rp 8.000.000', c: 'Gaji & Upah' },
    ],
  },
  {
    label: 'Freelancer',
    note: 'Pantau uang proyek yang masuk dan biaya kerja dari satu chat.',
    msgs: [
      { u: 'terima DP klien 2,5jt', t: 'Pemasukan', a: '+Rp 2.500.000', c: 'Pemasukan Lain' },
      { u: 'langganan software 180rb', t: 'Pengeluaran', a: '-Rp 180.000', c: 'Pengeluaran Lain' },
    ],
  },
  {
    label: 'UMKM / Warung',
    note: 'Catat omzet dan belanja bahan tanpa buku kas.',
    msgs: [
      { u: 'jual online 12 pesanan 540rb', t: 'Pemasukan', a: '+Rp 540.000', c: 'Penjualan Online' },
      { u: 'belanja bahan di pasar 350rb', t: 'Pengeluaran', a: '-Rp 350.000', c: 'Bahan Baku' },
    ],
  },
  {
    label: 'Mahasiswa',
    note: 'Uang saku cukup sampai akhir bulan, karena tahu ke mana perginya.',
    msgs: [
      { u: 'kiriman bulanan 1,5jt', t: 'Pemasukan', a: '+Rp 1.500.000', c: 'Pemasukan Lain' },
      { u: 'ojol ke kampus 18rb', t: 'Pengeluaran', a: '-Rp 18.000', c: 'Transportasi' },
    ],
  },
]

export function PersonaTabs() {
  const [active, setActive] = useState(0)
  const persona = PERSONAS[active]

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist">
        {PERSONAS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={
              i === active
                ? 'cursor-pointer rounded-full border border-cd-primary bg-cd-primary px-[18px] py-2.5 text-[15px] font-semibold text-white'
                : 'cursor-pointer rounded-full border border-cd-line-strong bg-white px-[18px] py-2.5 text-[15px] font-semibold text-cd-ink-3 transition-colors hover:border-cd-primary hover:text-cd-ink'
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <div className="flex flex-col gap-2.5 rounded-[22px] border border-cd-line bg-cd-bg p-6">
          {persona.msgs.map((c) => (
            <div key={c.u} className="flex flex-col gap-2">
              <div className="self-end rounded-[18px_18px_4px_18px] bg-cd-primary px-3.5 py-2.5 text-[15px] font-medium text-white">
                {c.u}
              </div>
              <div className="flex flex-col gap-0.5 self-start rounded-[18px_18px_18px_4px] bg-white px-3.5 py-2.5">
                <span className="flex items-center gap-1 text-xs font-bold text-cd-success">
                  <Check className="h-3 w-3" strokeWidth={3} /> Tercatat! {c.t}
                </span>
                <span className={`text-base font-bold ${c.t === 'Pengeluaran' ? 'text-cd-expense' : 'text-cd-primary'}`}>{c.a}</span>
                <span className="text-xs text-cd-muted-2">{c.c}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-3.5 px-1 py-2">
          <span className="text-sm font-semibold text-cd-primary">{persona.label}</span>
          <p className="m-0 text-[clamp(22px,2.4vw,28px)] font-bold leading-[1.3] tracking-[-.015em] text-pretty">{persona.note}</p>
          <p className="m-0 text-base leading-relaxed text-cd-muted">
            Tulis seperti chat ke teman. Nominal, jenis transaksi, dan kategori dikenali otomatis.
          </p>
        </div>
      </div>
    </>
  )
}
