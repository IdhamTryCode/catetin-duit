import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  MessageCircle,
  BarChart3,
  Zap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  TrendingUp,
  Bot,
  Star,
  ChevronDown,
} from 'lucide-react'
import { formatIDR } from '@/lib/utils'
import { SUBSCRIPTION_PRICE, TRIAL_DURATION_DAYS } from '@/lib/constants'

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Catat via Chat',
    description: 'Kirim pesan biasa ke bot Telegram. AI langsung mengerti dan mencatat transaksimu secara otomatis.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Bot,
    title: 'AI yang Pintar',
    description: 'Tulis "beli kopi 25rb" atau "gajian 5jt" — AI memahami bahasa natural Indonesia dan Inggris.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Interaktif',
    description: 'Lihat grafik cashflow, ringkasan bulanan, dan riwayat transaksi lengkap di satu tempat.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Laporan Otomatis',
    description: 'Ringkasan pemasukan dan pengeluaran per kategori, langsung tersaji tanpa perlu input manual.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Shield,
    title: 'Data Aman',
    description: 'Data kamu dilindungi dengan enkripsi dan Row Level Security. Hanya kamu yang bisa melihat datamu.',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: Smartphone,
    title: 'Tanpa Install App',
    description: 'Cukup pakai Telegram yang sudah ada di HP kamu. Tidak perlu install aplikasi baru.',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Daftar & Hubungkan Telegram',
    description: 'Buat akun gratis, lalu hubungkan akun kamu dengan bot Telegram Catetin Duit dalam hitungan detik.',
  },
  {
    step: '02',
    title: 'Chat Seperti Biasa',
    description: 'Kirim pesan ke bot kapanpun kamu belanja, makan, atau terima uang. Tulis natural, AI yang urus sisanya.',
  },
  {
    step: '03',
    title: 'Pantau di Dashboard',
    description: 'Buka dashboard web untuk melihat laporan keuangan, grafik, dan analisis pengeluaran kamu.',
  },
]

const PRICING_FEATURES = [
  `${TRIAL_DURATION_DAYS} hari trial gratis, tanpa kartu kredit`,
  'Catat transaksi via Telegram',
  'Dashboard web interaktif',
  'Grafik cashflow bulanan',
  'Riwayat transaksi lengkap',
  'Kategorisasi otomatis oleh AI',
  'Data aman & terenkripsi',
]

const PREMIUM_EXTRA = [
  'Pencatatan tanpa batas',
  'Semua fitur trial tetap aktif',
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
    a: 'Ya, kamu bisa cancel langganan kapan saja. Data kamu tetap aman dan bisa diakses meskipun sudah cancel.',
  },
  {
    q: 'Apakah data saya aman?',
    a: 'Sangat aman. Data kamu dienkripsi dan dilindungi dengan Row Level Security di Supabase. Hanya kamu yang bisa mengakses datamu.',
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

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const priceFormatted = formatIDR(SUBSCRIPTION_PRICE)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass-header">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <Image src="/logo.png" alt="Catetin Duit" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-base tracking-tight">Catetin Duit</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {([['#cara-kerja', 'Cara Kerja'], ['#fitur', 'Fitur'], ['#harga', 'Harga']] as const).map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/6 rounded-lg transition-all duration-150"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button size="sm" asChild className="gap-1.5 shadow-sm" style={{ boxShadow: '0 2px 10px oklch(0.48 0.128 162 / 0.28)' }}>
              <Link href="/register">
                Coba Gratis
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Dual gradient orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute top-0 left-1/3 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute top-0 right-1/3 translate-x-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/6 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Star className="h-3 w-3 fill-current" />
            Trial {TRIAL_DURATION_DAYS} hari gratis, tanpa kartu kredit
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Catat keuangan cukup
            <br />
            <span className="text-primary">kirim chat ke Telegram</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Tidak perlu buka aplikasi atau isi form. Cukup kirim pesan biasa seperti{' '}
            <span className="font-medium text-foreground">&quot;beli kopi 25rb&quot;</span> dan AI akan
            langsung mencatatnya untuk kamu.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <Link href="/register">
                Mulai Gratis Sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
              <a href="#cara-kerja">
                Lihat Cara Kerja
              </a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Tidak perlu kartu kredit · Cancel kapan saja
          </p>
        </div>
      </section>

      {/* Chat preview */}
      <section className="py-12 border-y border-border/50 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">
            Contoh percakapan nyata
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <ChatBubble
              messages={[
                { from: 'user', text: 'beli makan siang 35rb' },
                { from: 'bot', text: '✅ Tercatat! Pengeluaran Rp 35.000 — Makanan & Minuman' },
                { from: 'user', text: 'terima gaji 8jt' },
                { from: 'bot', text: '✅ Tercatat! Pemasukan Rp 8.000.000 — Gaji' },
              ]}
            />
            <ChatBubble
              messages={[
                { from: 'user', text: 'bayar listrik 450.000' },
                { from: 'bot', text: '✅ Tercatat! Pengeluaran Rp 450.000 — Tagihan & Utilitas' },
                { from: 'user', text: 'bensin motor 80rb' },
                { from: 'bot', text: '✅ Tercatat! Pengeluaran Rp 80.000 — Transportasi' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="cara-kerja" className="py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cara Kerja</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Mulai mencatat keuangan dalam 3 langkah mudah
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-lg mb-5">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">
            Apa kata pengguna beta
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-border/50">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Semua yang Kamu Butuhkan</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Fitur lengkap untuk kelola keuangan pribadi maupun usaha kecil
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                className="border-border/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
              >
                <CardContent className="pt-6">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${f.bg} mb-4`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Harga Simpel, Tanpa Kejutan</h2>
            <p className="text-muted-foreground text-lg">
              Mulai gratis, upgrade kapan saja
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto pt-4">
            {/* Trial */}
            <Card className="border-border/50">
              <CardContent className="pt-6 space-y-5">
                <div>
                  <p className="font-semibold text-lg">Trial</p>
                  <p className="text-muted-foreground text-sm">Coba semua fitur gratis</p>
                </div>
                <div>
                  <span className="text-4xl font-bold">Gratis</span>
                  <span className="text-muted-foreground ml-2">/ {TRIAL_DURATION_DAYS} hari</span>
                </div>
                <ul className="space-y-2">
                  {PRICING_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/register">Mulai Trial Gratis</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className="border-primary relative animate-pulse-ring overflow-visible">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3">
                  <Zap className="h-3 w-3 mr-1" />
                  Paling Populer
                </Badge>
              </div>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <p className="font-semibold text-lg">Premium</p>
                  <p className="text-muted-foreground text-sm">Akses penuh tanpa batas</p>
                </div>
                <div>
                  <span className="text-4xl font-bold">{priceFormatted}</span>
                  <span className="text-muted-foreground ml-2">/ bulan</span>
                </div>
                <ul className="space-y-2">
                  {[...PRICING_FEATURES, ...PREMIUM_EXTRA].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full gap-2" asChild>
                  <Link href="/register">
                    Mulai Sekarang
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Pertanyaan Umum</h2>
            <p className="text-muted-foreground">Ada pertanyaan? Kami siap bantu.</p>
          </div>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details key={item.q} className="group border border-border/60 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-sm list-none hover:bg-muted/40 transition-colors">
                  {item.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Siap catat keuangan lebih mudah?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Bergabung dan coba gratis selama {TRIAL_DURATION_DAYS} hari. Tidak perlu kartu kredit.
          </p>
          <Button size="lg" variant="secondary" className="gap-2 text-base px-8" asChild>
            <Link href="/register">
              Daftar Gratis Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/25">
        {/* Main content */}
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">

            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Catetin Duit" width={32} height={32} className="rounded-lg" />
                <span className="font-bold text-base tracking-tight">Catetin Duit</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[230px]">
                Asisten keuangan AI via Telegram. Catat, pantau, dan analisa keuanganmu dengan mudah.
              </p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-muted-foreground">Layanan aktif 24/7</span>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-widest">Produk</p>
                <ul className="space-y-2.5">
                  <li><a href="#cara-kerja" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150">Cara Kerja</a></li>
                  <li><a href="#fitur" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150">Fitur</a></li>
                  <li><a href="#harga" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150">Harga</a></li>
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-widest">Akun</p>
                <ul className="space-y-2.5">
                  <li><Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150">Masuk</Link></li>
                  <li><Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150">Daftar Gratis</Link></li>
                </ul>
              </div>
            </div>

            {/* CTA mini card */}
            <div>
              <div className="rounded-xl border border-primary/20 bg-primary/6 p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground">Mulai gratis sekarang</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  7 hari trial penuh. Tidak perlu kartu kredit. Cancel kapan saja.
                </p>
                <Button size="sm" className="w-full gap-1.5" asChild>
                  <Link href="/register">
                    Coba Gratis <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40">
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Catetin Duit. Dibuat untuk UMKM Indonesia.
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-primary/70" />
              <span>Data terenkripsi & aman</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// --- Sub-components ---

interface ChatMessage {
  from: 'user' | 'bot'
  text: string
}

function ChatBubble({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="bg-background rounded-2xl border border-border/50 p-4 space-y-3 shadow-sm">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex animate-fade-in-up ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              msg.from === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  )
}
