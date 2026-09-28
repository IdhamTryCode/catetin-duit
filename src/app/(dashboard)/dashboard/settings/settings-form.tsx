'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { updateProfile, disconnectTelegram } from './actions'
import { BOT_USERNAME, TIMEZONES, VALID_TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/constants'
import { isValidTimezone } from '@/lib/utils'
import { FIELD, LABEL } from '@/components/dashboard/modal'
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from '@/components/dashboard/ui'

const settingsSchema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter'),
  timezone: z.enum(VALID_TIMEZONES),
})

type SettingsValues = z.infer<typeof settingsSchema>

interface Props {
  email: string
  initialValues: {
    full_name: string
    timezone: string
    telegram_chat_id: number | null
  }
}

export function SettingsForm({ email, initialValues }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: initialValues.full_name,
      // Runtime validation instead of unsafe type cast
      timezone: isValidTimezone(initialValues.timezone) ? initialValues.timezone : DEFAULT_TIMEZONE,
    },
  })
  const nameError = form.formState.errors.full_name?.message

  async function onSubmit(values: SettingsValues) {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('full_name', values.full_name)
    formData.append('timezone', values.timezone)
    const result = await updateProfile(formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      setSaved(true)
    }
    setIsLoading(false)
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className={`${CARD} flex flex-col gap-[18px] p-6`}>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold">Profil</span>
          <span className="text-sm text-cd-muted-2">Informasi akun kamu</span>
        </div>

        <div className={LABEL}>
          Email
          <div className="rounded-xl bg-cd-bg px-3.5 py-3 text-[15px] font-normal text-cd-muted">{email}</div>
        </div>

        <label className={LABEL}>
          Nama Lengkap
          <input
            {...form.register('full_name', { onChange: () => setSaved(false) })}
            aria-invalid={!!nameError}
            className={`${FIELD} font-normal`}
          />
          {nameError && <span className="text-[13px] font-medium text-cd-expense">{nameError}</span>}
        </label>

        <label className={LABEL}>
          Zona Waktu
          <select {...form.register('timezone', { onChange: () => setSaved(false) })} className={`${FIELD} font-normal`}>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.value} ({tz.label.split(' ')[0]})
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isLoading} className={BTN_PRIMARY}>
            {isLoading ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
          {saved && <span className="text-[13px] font-semibold text-cd-success">✓ Tersimpan</span>}
        </div>
      </form>

      <TelegramCard connected={!!initialValues.telegram_chat_id} />
    </>
  )
}

function TelegramCard({ connected }: { connected: boolean }) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  async function handleDisconnect() {
    if (!confirm('Yakin ingin memutuskan koneksi Telegram?')) return
    setIsDisconnecting(true)
    await disconnectTelegram()
    setIsDisconnecting(false)
  }

  return (
    <div className={`${CARD} flex flex-wrap items-center justify-between gap-4 p-6`}>
      <div className="flex flex-col gap-1">
        <span className="text-base font-bold">Telegram</span>
        {connected ? (
          <span className="text-sm font-semibold text-cd-success">● Terhubung ke @{BOT_USERNAME}</span>
        ) : (
          <span className="text-sm text-cd-muted-2">Belum terhubung</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {connected && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="cursor-pointer rounded-[11px] px-3.5 py-2.5 text-sm font-semibold text-cd-expense hover:bg-[#FDF0F0] disabled:opacity-50"
          >
            {isDisconnecting ? 'Memproses…' : 'Putuskan'}
          </button>
        )}
        <Link href="/dashboard/telegram" className={BTN_SECONDARY}>
          Kelola
        </Link>
      </div>
    </div>
  )
}
