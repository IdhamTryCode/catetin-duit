import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check, Download, Info, Lock } from 'lucide-react'
import { formatIDR } from '@/lib/utils'
import { BOT_USERNAME, SUBSCRIPTION_PRICE, TRIAL_DURATION_DAYS } from '@/lib/constants'
import { HeroChat } from '@/components/landing/hero-chat'
import { PersonaTabs } from '@/components/landing/persona-tabs'
import { Faq } from '@/components/landing/faq'

const NAV = [
  ['#cara-kerja', 'Cara Kerja'],
  ['#fitur', 'Fitur'],
  ['#harga', 'Harga'],
  ['#faq', 'FAQ'],
] as const

const STEPS = [
  { n: '01', title: 'Daftar akun gratis', body: <>Pakai Google, GitHub, atau email. Kamu langsung masuk ke dashboard.</> },
  { n: '02', title: 'Buat kode di menu Telegram', body: <>Buka menu Telegram di dashboard, lalu tekan Generate Kode.</> },
  {
    n: '03',
    title: 'Tekan Start di bot',
    body: (
      <>
        Tombol <strong className="font-semibold text-cd-ink">Hubungkan otomatis di Telegram</strong> membuka bot. Tekan Start, akunmu langsung terhubung.
      </>
    ),
  },
]

const COMMANDS = [
  ['/riwayat', 'Lihat transaksi terakhir'],
  ['/ringkasan', 'Ringkasan bulan ini'],
  ['/bantuan', 'Tampilkan panduan'],
] as const

const TRIAL_FEATURES = [
  `${TRIAL_DURATION_DAYS} hari trial gratis, tanpa kartu kredit`,
  'Catat transaksi via Telegram',
  'Dashboard web interaktif',
  'Grafik cashflow bulanan',
  'Riwayat transaksi lengkap',
  'Kategorisasi otomatis oleh AI',
  'Data aman & terenkripsi',
]

const PREMIUM_EXTRA = [
  `${TRIAL_DURATION_DAYS} hari trial gratis, tanpa kartu kredit`,
  'Pencatatan tanpa batas',
  'Prioritas support',
]

const TESTIMONIALS = [
  {
    initials: 'AR',
    name: 'Andi R.',
    role: 'Pemilik warung makan',
    quote: 'Sekarang saya tahu berapa pemasukan harian tanpa harus buka buku catatan. Tinggal chat ke bot, selesai.',
  },
  {
    initials: 'SP',
    name: 'Siti P.',
    role: 'Freelancer desain grafis',
    quote: 'Akhirnya ada apps keuangan yang sesimple kirim WA. Dan laporannya lengkap banget di dashboard!',
  },
  {
    initials: 'BW',
    name: 'Budi W.',
    role: 'Pengguna beta',
    quote: 'Udah coba banyak apps keuangan, tapi ini yang paling gampang dipakai sehari-hari karena via Telegram.',
  },
]

const FAQ = [
  {
    q: 'Apakah bisa cancel kapan saja?',
    a: 'Bisa. Tidak ada kontrak. Kamu bisa berhenti berlangganan kapan saja dari menu Langganan di dashboard.',
  },
  {
    q: 'Apakah data saya aman?',
    a: 'Data transaksi disimpan terenkripsi dan hanya bisa diakses oleh akunmu. Bot hanya membaca pesan yang kamu kirim langsung kepadanya.',
  },
  {
    q: 'Metode pembayaran apa yang diterima?',
    a: 'Kami menerima QRIS, transfer bank (BCA, Mandiri, BNI, dll), GoPay, OVO, DANA, dan berbagai e-wallet lainnya via Duitku.',
  },
  {
    q: 'Setelah trial berakhir, apa yang terjadi?',
    a: 'Kamu masih bisa mengakses dashboard web untuk melihat data. Pencatatan baru via Telegram akan dinonaktifkan hingga upgrade ke Premium.',
  },
]

const H2 = 'm-0 text-[clamp(30px,3.6vw,42px)] font-extrabold leading-[1.1] tracking-[-.025em] text-balance'
const EYEBROW = 'text-[13px] font-bold uppercase tracking-[.08em] text-cd-primary'
const GRID = (min: number) => ({ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` })

function Logo({ size = 32, textClass = 'text-[17px]' }: { size?: number; textClass?: string }) {
  return (
    <span className="flex items-center gap-2.5 text-cd-ink">
      <Image src="/logo.png" alt="" width={size} height={size} className="rounded-[9px]" style={{ width: size, height: size }} />
      <span className={`font-bold tracking-[-.01em] ${textClass}`}>Catetin Duit</span>
    </span>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const priceFormatted = formatIDR(SUBSCRIPTION_PRICE)

  return (
    <div className="flex min-h-screen flex-col bg-cd-bg text-cd-ink">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-cd-line bg-[rgba(244,249,246,.86)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1160px] items-center gap-6 px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="Catetin Duit">
            <Logo />
          </Link>
          <nav className="ml-auto hidden gap-7 md:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium text-cd-ink-3 hover:text-cd-primary-hover">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link href="/login" className="hidden rounded-[10px] px-3.5 py-[9px] text-sm font-semibold text-cd-ink hover:bg-cd-tint sm:block">
              Masuk
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 rounded-[10px] bg-cd-primary px-4 py-[9px] text-sm font-semibold text-white hover:bg-cd-primary-hover"
            >
              Coba Gratis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="px-4 pb-[88px] pt-16 sm:px-6 sm:pt-[72px]">
        <div className="mx-auto grid max-w-[1160px] items-center gap-14" style={GRID(420)}>
          <div className="flex flex-col gap-6">
            <div className="flex">
              <span className="flex items-center gap-2 rounded-full border border-cd-line-strong bg-white py-1.5 pl-2 pr-3 text-[13px] font-semibold text-cd-primary-hover">
                <span className="h-2 w-2 rounded-full bg-cd-accent" />
                Trial {TRIAL_DURATION_DAYS} hari gratis, tanpa kartu kredit
              </span>
            </div>
            <h1 className="m-0 text-[clamp(40px,5.6vw,66px)] font-extrabold leading-[1.02] tracking-[-.035em] text-balance">
              Catat keuangan cukup <span className="text-cd-primary">kirim chat ke Telegram</span>
            </h1>
            <p className="m-0 max-w-[520px] text-lg leading-relaxed text-cd-muted text-pretty">
              Tidak perlu buka aplikasi atau isi form. Cukup kirim pesan biasa seperti{' '}
              <strong className="font-semibold text-cd-ink">&quot;beli kopi 25rb&quot;</strong> dan AI akan langsung mencatatnya untuk kamu.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-xl bg-cd-primary px-6 py-[15px] text-base font-bold text-white shadow-[0_8px_24px_-10px_rgba(0,117,74,.6)] hover:bg-cd-primary-hover"
              >
                Mulai Gratis Sekarang <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#cara-kerja"
                className="rounded-xl border border-cd-line-strong bg-white px-[22px] py-[15px] text-base font-semibold text-cd-ink hover:border-cd-primary"
              >
                Lihat Cara Kerja
              </a>
            </div>
            <div className="flex flex-wrap gap-[18px] text-[13px] font-medium text-cd-muted-2">
              {['Tidak perlu kartu kredit', 'Cancel kapan saja', 'Siap dalam 1 menit'].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> {t}
                </span>
              ))}
            </div>
          </div>
          <HeroChat />
        </div>
      </section>

      {/* Untuk siapa */}
      <section className="border-y border-cd-line bg-white px-4 py-[88px] sm:px-6">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-10">
          <div className="flex max-w-[640px] flex-col gap-3">
            <span className={EYEBROW}>Untuk siapa</span>
            <h2 className={H2}>Satu bot, cara catatnya sesuai keseharianmu</h2>
          </div>
          <PersonaTabs />
        </div>
      </section>

      {/* Cara kerja */}
      <section id="cara-kerja" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-12">
          <div className="flex max-w-[640px] flex-col gap-3">
            <span className={EYEBROW}>Cara kerja</span>
            <h2 className={H2}>Terhubung dalam kurang dari semenit</h2>
            <p className="m-0 text-[17px] leading-relaxed text-cd-muted">
              Tanpa install aplikasi baru. Cukup akun Telegram yang sudah kamu pakai.
            </p>
          </div>
          <div className="grid gap-4" style={GRID(240)}>
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3 rounded-[20px] border border-cd-line bg-white p-6">
                <span className="font-mono text-[13px] text-cd-primary">{s.n}</span>
                <h3 className="m-0 text-lg font-bold">{s.title}</h3>
                <p className="m-0 text-[15px] leading-[1.55] text-cd-muted">{s.body}</p>
              </div>
            ))}
            <div className="flex flex-col gap-3 rounded-[20px] bg-cd-dark p-6 text-white">
              <span className="font-mono text-[13px] text-cd-accent-text">04</span>
              <h3 className="m-0 text-lg font-bold">Chat, lalu pantau</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-cd-on-dark">
                Kirim transaksi kapan saja. Laporan dan grafik muncul di dashboard web.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[14px] bg-cd-tint px-[18px] py-3.5 text-sm leading-[1.55] text-cd-ink-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-cd-primary" />
            <span>
              Tombol tidak membuka Telegram? Kirim{' '}
              <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[13px]">/connect KODE</code> secara manual ke @
              {BOT_USERNAME}. Kode berlaku 15 menit.
            </span>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="scroll-mt-16 border-y border-cd-line bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-12">
          <div className="flex max-w-[640px] flex-col gap-3">
            <span className={EYEBROW}>Fitur</span>
            <h2 className={H2}>Semua yang Kamu Butuhkan</h2>
            <p className="m-0 text-[17px] leading-relaxed text-cd-muted">
              Fitur lengkap untuk kelola keuangan pribadi maupun usaha kecil.
            </p>
          </div>
          <div className="grid gap-4" style={GRID(320)}>
            <FeatureCard
              title="Dashboard Interaktif"
              body="Lihat grafik cashflow, ringkasan bulanan, dan riwayat transaksi lengkap di satu tempat."
              visual={
                <div className="flex h-24 items-end gap-2" aria-hidden>
                  {[
                    ['70%', 'bg-cd-accent'],
                    ['30%', 'bg-[#F2A3A3]'],
                    ['85%', 'bg-cd-accent'],
                    ['42%', 'bg-[#F2A3A3]'],
                    ['100%', 'bg-cd-primary'],
                    ['36%', 'bg-[#E05555]'],
                  ].map(([h, c], i) => (
                    <div key={i} className={`flex-1 rounded-[6px_6px_2px_2px] ${c}`} style={{ height: h }} />
                  ))}
                </div>
              }
            />
            <FeatureCard
              title="AI yang Pintar"
              body={'Tulis "beli kopi 25rb" atau "gajian 5jt". AI memahami bahasa natural Indonesia dan Inggris.'}
              visual={
                <div className="flex h-24 flex-col justify-center gap-2" aria-hidden>
                  {['"gajian 5jt"', '"paid lunch 45k"'].map((t) => (
                    <span key={t} className="self-start rounded-xl border border-cd-line bg-white px-3 py-[7px] text-sm">{t}</span>
                  ))}
                </div>
              }
            />
            <FeatureCard
              title="Kategorisasi Otomatis"
              body="Setiap transaksi masuk ke kategori yang tepat. Buat kategori sendiri kalau perlu."
              visual={
                <div className="flex h-24 flex-wrap content-center gap-1.5" aria-hidden>
                  {['Makanan & Minuman', 'Transportasi', 'Gaji & Upah', 'Bahan Baku', 'Penjualan Online'].map((c) => (
                    <span
                      key={c}
                      className={
                        c === 'Gaji & Upah'
                          ? 'rounded-full bg-cd-primary px-2.5 py-1.5 text-[13px] font-semibold text-white'
                          : 'rounded-full border border-cd-line bg-white px-2.5 py-1.5 text-[13px] font-semibold'
                      }
                    >
                      {c}
                    </span>
                  ))}
                </div>
              }
            />
            <FeatureCard
              title="Laporan Langsung di Chat"
              body="Cek riwayat dan ringkasan bulanan tanpa perlu buka dashboard."
              visual={
                <div className="flex h-24 flex-col justify-center gap-1.5 font-mono text-[13px]">
                  {COMMANDS.map(([cmd, desc]) => (
                    <span key={cmd}>
                      <span className="text-cd-primary">{cmd}</span> <span className="text-cd-muted-2">— {desc}</span>
                    </span>
                  ))}
                </div>
              }
            />
            <FeatureCard
              title="Data Aman & Terenkripsi"
              body="Catatan keuanganmu hanya bisa diakses oleh akunmu sendiri."
              visual={
                <div className="flex h-24 items-center" aria-hidden>
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cd-line bg-white">
                    <Lock className="h-6 w-6 text-cd-primary" />
                  </div>
                </div>
              }
            />
            <FeatureCard
              title="Edit & Export"
              body="Ubah atau hapus transaksi dari web, tambah manual, dan unduh semua data kapan saja."
              visual={
                <div className="flex h-24 items-center" aria-hidden>
                  <span className="flex items-center gap-1.5 rounded-[10px] border border-cd-line bg-white px-3 py-2 text-[13px] font-semibold">
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </span>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* Testimoni */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-10">
          <span className={EYEBROW}>Apa kata pengguna beta</span>
          <div className="grid gap-4" style={GRID(300)}>
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="m-0 flex flex-col justify-between gap-7 rounded-[22px] border border-cd-line bg-white p-7">
                <blockquote className="m-0 text-lg font-medium leading-normal tracking-[-.005em] text-pretty">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-cd-tint text-sm font-bold text-cd-primary">{t.initials}</div>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-bold">{t.name}</span>
                    <span className="text-[13px] text-cd-muted-2">{t.role}</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Harga */}
      <section id="harga" className="scroll-mt-16 border-y border-cd-line bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto flex max-w-[880px] flex-col gap-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className={EYEBROW}>Harga</span>
            <h2 className={H2}>Harga Simpel, Tanpa Kejutan</h2>
            <p className="m-0 text-[17px] text-cd-muted">Mulai gratis, upgrade kapan saja.</p>
          </div>
          <div className="grid items-stretch gap-5" style={GRID(320)}>
            <div className="flex flex-col gap-6 rounded-3xl border border-cd-line bg-cd-bg p-8">
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold">Trial</span>
                <span className="text-sm text-cd-muted-2">Coba semua fitur gratis</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold tracking-[-.03em]">Gratis</span>
                <span className="text-[15px] text-cd-muted-2">/ {TRIAL_DURATION_DAYS} hari</span>
              </div>
              <ul className="m-0 flex flex-1 list-none flex-col gap-3 p-0 text-[15px]">
                {TRIAL_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cd-success" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="rounded-xl border border-cd-line-strong bg-white p-3.5 text-center text-[15px] font-bold text-cd-ink hover:border-cd-primary"
              >
                Mulai Trial Gratis
              </Link>
            </div>

            <div className="relative flex flex-col gap-6 rounded-3xl bg-cd-dark p-8 text-white shadow-[0_30px_60px_-30px_rgba(6,20,13,.6)]">
              <span className="absolute right-7 top-7 rounded-full bg-cd-accent px-2.5 py-[5px] text-xs font-bold text-cd-dark">
                Paling Populer
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold">Premium</span>
                <span className="text-sm text-cd-on-dark-2">Akses penuh tanpa batas</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold tracking-[-.03em]">{priceFormatted}</span>
                <span className="text-[15px] text-cd-on-dark-2">/ bulan</span>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <span className="text-sm text-cd-on-dark-2">Semua fitur Trial tetap aktif, ditambah:</span>
                <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
                  {PREMIUM_EXTRA.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cd-accent-text" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/register"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-cd-accent p-3.5 text-[15px] font-bold text-cd-dark hover:bg-cd-accent-hover"
              >
                Mulai Sekarang <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto flex max-w-[760px] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className={EYEBROW}>FAQ</span>
            <h2 className={H2}>Pertanyaan Umum</h2>
          </div>
          <Faq items={FAQ} />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center gap-5 rounded-[32px] bg-cd-dark px-8 py-[72px] text-center text-white">
          <h2 className="m-0 text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.08] tracking-[-.03em] text-balance">
            Siap catat keuangan lebih mudah?
          </h2>
          <p className="m-0 text-[17px] text-cd-on-dark">
            Bergabung dan coba gratis selama {TRIAL_DURATION_DAYS} hari. Tidak perlu kartu kredit.
          </p>
          <Link
            href="/register"
            className="mt-2 flex items-center gap-1.5 rounded-xl bg-cd-accent px-[26px] py-[15px] text-base font-bold text-cd-dark hover:bg-cd-accent-hover"
          >
            Daftar Gratis Sekarang <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-cd-line px-4 pb-8 pt-12 sm:px-6">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-10">
          <div className="flex flex-wrap justify-between gap-12">
            <div className="flex max-w-[320px] flex-col gap-3.5">
              <Logo size={30} textClass="text-base" />
              <p className="m-0 text-sm leading-relaxed text-cd-muted-2">
                Asisten keuangan AI via Telegram. Catat, pantau, dan analisa keuanganmu dengan mudah.
              </p>
            </div>
            <div className="flex flex-wrap gap-16">
              <div className="flex flex-col gap-3 text-sm">
                <span className="text-xs font-bold tracking-[.08em] text-cd-ink">PRODUK</span>
                <a href="#cara-kerja" className="text-cd-muted-2 hover:text-cd-primary">Cara Kerja</a>
                <a href="#fitur" className="text-cd-muted-2 hover:text-cd-primary">Fitur</a>
                <a href="#harga" className="text-cd-muted-2 hover:text-cd-primary">Harga</a>
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <span className="text-xs font-bold tracking-[.08em] text-cd-ink">AKUN</span>
                <Link href="/login" className="text-cd-muted-2 hover:text-cd-primary">Masuk</Link>
                <Link href="/register" className="text-cd-muted-2 hover:text-cd-primary">Daftar Gratis</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-cd-line pt-6 text-[13px] text-cd-muted-2">
            <span>© {new Date().getFullYear()} Catetin Duit. Dibuat untuk UMKM Indonesia.</span>
            <span>Data terenkripsi &amp; aman</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, body, visual }: { title: string; body: string; visual: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-[22px] border border-cd-line bg-cd-bg p-7">
      {visual}
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-lg font-bold">{title}</h3>
        <p className="m-0 text-[15px] leading-[1.55] text-cd-muted">{body}</p>
      </div>
    </div>
  )
}
