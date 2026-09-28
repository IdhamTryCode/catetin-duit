import { cn } from '@/lib/utils'

/** Judul halaman dashboard (28/800) + subjudul, dengan slot aksi di kanan. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-.02em] md:text-[28px]">{title}</h1>
        {subtitle && <p className="m-0 text-[15px] text-cd-muted-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Inisial kategori, mis. "Makanan & Minuman" → "MM". */
export function initialsOf(label: string) {
  return label
    .split(' ')
    .filter((w) => w && w !== '&')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Ikon inisial kategori: hijau untuk pemasukan, merah untuk pengeluaran. */
export function TxIcon({ label, income, className }: { label: string; income: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] text-[13px] font-bold',
        income ? 'bg-cd-tint text-cd-primary-hover' : 'bg-[#FBEAEA] text-[#A12828]',
        className,
      )}
      aria-hidden
    >
      {initialsOf(label)}
    </div>
  )
}

/** Tombol sekunder & primer dashboard (dipakai sebagai className). */
export const BTN_SECONDARY =
  'inline-flex items-center gap-1.5 rounded-[11px] border border-cd-line-strong bg-white px-3.5 py-2.5 text-sm font-semibold text-cd-ink hover:border-cd-primary'
export const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-[11px] bg-cd-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-cd-primary-hover disabled:opacity-60'

/** Kartu putih standar dashboard. */
export const CARD = 'rounded-[18px] border border-cd-line bg-white'
