import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export function generateMetadata(): Metadata {
  return {
    title: 'Catetin Duit — Asisten Keuangan AI via Telegram',
    description: 'Catat transaksi keuangan otomatis via Telegram dengan AI. Dashboard web interaktif untuk laporan keuangan bisnis kamu.',
    icons: {
      icon: '/favicon.ico',
    },
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
