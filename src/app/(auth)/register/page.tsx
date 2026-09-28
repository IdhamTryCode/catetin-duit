'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { OAuthButtons } from '../oauth-buttons'
import { signup } from '../actions'
import { AUTH_ERROR, AUTH_INPUT, AUTH_SUBMIT, AuthCard } from '@/components/auth-card'
import { cn } from '@/lib/utils'

const registerSchema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Password tidak cocok',
  path: ['confirm_password'],
})

type RegisterValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  })

  async function onSubmit(values: RegisterValues) {
    setIsLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('full_name', values.full_name)
    formData.append('email', values.email)
    formData.append('password', values.password)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      // Signup berhasil — tampilkan pesan konfirmasi email
      setSuccess(true)
      setIsLoading(false)
    }
  }

  return (
    <AuthCard tab="register" title="Buat akun baru" description="Trial gratis 7 hari, tidak perlu kartu kredit">
      {success && (
        <div className="space-y-1 rounded-xl border border-cd-line-strong bg-cd-tint px-4 py-3 text-center text-sm text-cd-primary-hover">
          <p className="font-semibold">Pendaftaran berhasil! 🎉</p>
          <p>Cek email kamu untuk mengkonfirmasi akun, lalu login.</p>
        </div>
      )}

      <OAuthButtons mode="register" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <div className={AUTH_ERROR}>{error}</div>}
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="Nama kamu" className={AUTH_INPUT} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Email</FormLabel>
                <FormControl>
                  <Input placeholder="nama@email.com" type="email" className={AUTH_INPUT} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Minimal 8 karakter"
                      type={showPassword ? 'text' : 'password'}
                      className={cn(AUTH_INPUT, 'pr-[72px]')}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 text-[13px] font-semibold text-cd-muted-2 hover:text-cd-ink"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? 'Sembunyi' : 'Lihat'}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Konfirmasi Password</FormLabel>
                <FormControl>
                  <Input placeholder="Ulangi password" type={showPassword ? 'text' : 'password'} className={AUTH_INPUT} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className={AUTH_SUBMIT} disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
          </Button>
        </form>
      </Form>

      <div className="flex flex-wrap justify-center gap-3.5 text-[13px] text-cd-muted-2">
        {['7 hari gratis', 'Tanpa kartu kredit', 'Cancel kapan saja'].map((t) => (
          <span key={t} className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> {t}
          </span>
        ))}
      </div>
    </AuthCard>
  )
}
