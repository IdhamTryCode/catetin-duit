import { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Kelas input auth (redesign 2026): 15px, 13×14, radius 12, fokus hijau. */
export const AUTH_INPUT =
  'h-auto rounded-xl border-cd-line-strong bg-white px-3.5 py-[13px] text-[15px] text-cd-ink md:text-[15px] placeholder:text-cd-placeholder focus-visible:border-cd-primary focus-visible:ring-[3px] focus-visible:ring-[rgba(0,117,74,.15)]'

/** Tombol submit utama di halaman auth. */
export const AUTH_SUBMIT =
  'mt-1 h-auto w-full rounded-xl bg-cd-primary p-3.5 text-[15px] font-bold text-white hover:bg-cd-primary-hover'

/** Kotak error di atas form. */
export const AUTH_ERROR = 'rounded-xl border border-[#F0C8C8] bg-[#FDF0F0] px-3.5 py-2.5 text-sm text-[#8A1F1F]'

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Tampilkan switch Masuk / Daftar (dua route, ditata seperti segmented control). */
  tab?: 'login' | 'register'
}

const TABS = [
  { key: 'login', href: '/login', label: 'Masuk' },
  { key: 'register', href: '/register', label: 'Daftar' },
] as const

/**
 * Layout auth dua kolom: panel gelap berisi pesan produk di kiri,
 * form di kanan. Menumpuk jadi satu kolom di layar sempit.
 */
export function AuthCard({ title, description, children, footer, tab }: AuthCardProps) {
  return (
    <div className="grid min-h-screen bg-cd-bg text-cd-ink [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]">
      <div className="flex flex-col justify-between gap-10 bg-cd-dark p-8 text-white sm:p-10">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px]" />
          <span className="text-[17px] font-bold">Catetin Duit</span>
        </Link>
        <div className="flex max-w-[420px] flex-col gap-7">
          <h2 className="m-0 text-[clamp(28px,3vw,38px)] font-extrabold leading-[1.12] tracking-[-.025em] text-balance">
            Catat keuangan cukup kirim chat ke Telegram
          </h2>
          <div className="flex flex-col gap-2" aria-hidden>
            <span className="self-end rounded-[18px_18px_4px_18px] bg-cd-primary px-3.5 py-2.5 text-[15px]">beli kopi 25rb</span>
            <div className="flex flex-col gap-0.5 self-start rounded-[18px_18px_18px_4px] bg-cd-dark-2 px-3.5 py-2.5">
              <span className="flex items-center gap-1 text-xs font-bold text-cd-accent-text">
                <Check className="h-3 w-3" strokeWidth={3} /> Tercatat! Pengeluaran
              </span>
              <span className="text-base font-bold">Rp 25.000</span>
              <span className="text-xs text-cd-on-dark-3">Makanan &amp; Minuman</span>
            </div>
          </div>
        </div>
        <span className="text-[13px] text-cd-on-dark-3">Data terenkripsi &amp; aman</span>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          {tab && (
            <nav className="flex rounded-xl bg-cd-tint p-1" aria-label="Masuk atau daftar">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  aria-current={t.key === tab ? 'page' : undefined}
                  className={cn(
                    'flex-1 rounded-[9px] p-2.5 text-center text-sm',
                    t.key === tab
                      ? 'bg-white font-bold text-cd-ink shadow-[0_1px_2px_rgba(6,20,13,.1)]'
                      : 'font-semibold text-cd-muted-2 hover:text-cd-ink',
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em]">{title}</h1>
            {description && <p className="m-0 text-[15px] text-cd-muted-2">{description}</p>}
          </div>

          {children}

          {footer && <div className="text-center text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
