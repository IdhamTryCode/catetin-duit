'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AUTH_SUBMIT, AuthCard } from '@/components/auth-card'
import { resendConfirmation } from './actions'

const COOLDOWN = 60

/** Layar setelah daftar: minta user membuka link konfirmasi di email, lalu masuk. */
export function CheckEmail({ email, onReset }: { email: string; onReset?: () => void }) {
  const [wait, setWait] = useState(COOLDOWN)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function resend() {
    setSending(true)
    const res = await resendConfirmation(email)
    setSending(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success('Email konfirmasi dikirim ulang')
      setWait(COOLDOWN)
    }
  }

  return (
    <AuthCard tab="register" title="Cek email kamu" description="Satu langkah lagi sebelum akunmu aktif">
      <div className="flex flex-col gap-4 rounded-2xl border border-cd-line bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-cd-tint text-cd-primary">
            <MailCheck className="h-5 w-5" />
          </span>
          <p className="m-0 text-sm leading-relaxed text-cd-muted">
            Kami sudah mengirim link konfirmasi ke <strong className="break-all text-cd-ink">{email}</strong>.
          </p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm text-cd-ink-2">
          {[
            'Buka email dari Catetin Duit (cek juga folder Spam/Promosi).',
            'Klik link konfirmasi di email itu.',
            'Kembali ke sini dan masuk dengan email & password yang tadi.',
          ].map((step, i) => (
            <li key={step} className="flex gap-2.5">
              <span className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full bg-cd-tint text-xs font-bold text-cd-primary">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <Link href="/login" className={`${AUTH_SUBMIT} block text-center`}>
        Ke halaman Masuk
      </Link>

      <div className="flex flex-col items-center gap-1.5 text-center text-[13px] text-cd-muted-2">
        <span>
          Belum menerima email?{' '}
          <button
            type="button"
            onClick={resend}
            disabled={wait > 0 || sending}
            className="cursor-pointer font-semibold text-cd-primary hover:text-cd-primary-hover disabled:cursor-default disabled:text-cd-placeholder"
          >
            {sending ? 'Mengirim…' : wait > 0 ? `Kirim ulang (${wait} dtk)` : 'Kirim ulang'}
          </button>
        </span>
        {onReset && (
          <button type="button" onClick={onReset} className="cursor-pointer font-semibold text-cd-muted hover:text-cd-ink">
            Salah alamat email? Daftar ulang
          </button>
        )}
      </div>
    </AuthCard>
  )
}
