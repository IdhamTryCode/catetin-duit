'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { updateProfile, disconnectTelegram } from './actions'
import { toast } from 'sonner'
import { TIMEZONES, VALID_TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/constants'
import { isValidTimezone } from '@/lib/utils'

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
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: initialValues.full_name,
      // Runtime validation instead of unsafe type cast
      timezone: isValidTimezone(initialValues.timezone) ? initialValues.timezone : DEFAULT_TIMEZONE,
    },
  })

  async function onSubmit(values: SettingsValues) {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('full_name', values.full_name)
    formData.append('timezone', values.timezone)
    const result = await updateProfile(formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Profil berhasil diperbarui')
    }
    setIsLoading(false)
  }

  async function handleDisconnect() {
    if (!confirm('Yakin ingin memutuskan koneksi Telegram?')) return
    setIsDisconnecting(true)
    await disconnectTelegram()
    setIsDisconnecting(false)
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm">{email}</p>
          </div>

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona Waktu</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </form>
      </Form>

      {initialValues.telegram_chat_id && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Telegram</p>
            <p className="text-sm text-muted-foreground">Akun Telegram kamu sudah terhubung.</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? 'Memproses...' : 'Putuskan Koneksi Telegram'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
