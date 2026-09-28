import { STATUS_NAMES, daysLeft } from '@/lib/constants'

const PILL: Record<string, string> = {
  trial: 'bg-[#E8F0FE] text-[#1F4FA8]',
  premium: 'bg-cd-tint text-cd-primary-hover',
  grace_period: 'bg-[#FFF8EB] text-[#6B4A0E]',
  trial_expired: 'bg-[#FDF0F0] text-[#8A1F1F]',
  cancelled: 'bg-cd-bg text-cd-muted-2',
}

/** Pill status langganan untuk tabel & detail admin. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${PILL[status] ?? 'bg-cd-bg text-cd-muted-2'}`}>
      {STATUS_NAMES[status] ?? status}
    </span>
  )
}

/** "12 Okt 2026 · 4 hari lagi" / "lewat 3 hari". */
export function EndsAt({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <span className="text-cd-placeholder">—</span>
  const d = new Date(iso)
  const left = daysLeft(iso) ?? 0
  const past = d.getTime() < Date.now()
  const pastDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  return (
    <span className="flex flex-col">
      <span>{d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}</span>
      <span className={`text-[11px] ${past ? 'text-cd-expense' : left <= 3 ? 'font-semibold text-[#6B4A0E]' : 'text-cd-muted-2'}`}>
        {past ? `lewat ${pastDays} hari` : left === 0 ? 'hari ini' : `${left} hari lagi`}
      </span>
    </span>
  )
}

export function StatCard({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: 'dark' }) {
  return (
    <div className={tone === 'dark' ? 'flex flex-col gap-2 rounded-[18px] bg-cd-dark p-5 text-white' : 'flex flex-col gap-2 rounded-[18px] border border-cd-line bg-white p-5'}>
      <span className={`text-xs font-bold tracking-[.07em] ${tone === 'dark' ? 'text-cd-on-dark-3' : 'text-cd-muted-2'}`}>{label}</span>
      <span className={`text-2xl font-extrabold tracking-[-.02em] ${tone === 'dark' ? 'text-cd-accent-text' : ''}`}>{value}</span>
      {note && <span className={`text-[13px] ${tone === 'dark' ? 'text-cd-on-dark-3' : 'text-cd-muted-2'}`}>{note}</span>}
    </div>
  )
}
