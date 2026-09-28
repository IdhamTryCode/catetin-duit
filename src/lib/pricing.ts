import { TRIAL_DURATION_DAYS } from '@/lib/constants'

/** Fitur paket Trial — dipakai di landing & halaman Langganan. */
export const TRIAL_FEATURES = [
  `${TRIAL_DURATION_DAYS} hari trial gratis, tanpa kartu kredit`,
  'Catat transaksi via Telegram',
  'Dashboard web interaktif',
  'Grafik cashflow bulanan',
  'Riwayat transaksi lengkap',
  'Kategorisasi otomatis oleh AI',
  'Data aman & terenkripsi',
]

/**
 * Tambahan paket Premium. Selama trial aksesnya sudah penuh, jadi yang
 * membedakan Premium adalah akses yang berlanjut setelah trial berakhir.
 */
export const PREMIUM_EXTRA = [
  'Akses penuh berlanjut setelah trial',
  'Pencatatan tanpa batas',
  'Prioritas support',
]
