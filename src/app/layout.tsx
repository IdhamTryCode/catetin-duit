import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export function generateMetadata(): Metadata {
  return {
    title: 'Catetin Duit — Asisten Keuangan AI via Telegram',
    description: 'Catat transaksi keuangan otomatis via Telegram dengan AI. Dashboard web interaktif untuk laporan keuangan bisnis kamu.',
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
