'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { OAuthButtons } from '../oauth-buttons'
import { login } from '../actions'
import { AUTH_ERROR, AUTH_INPUT, AUTH_SUBMIT, AuthCard } from '@/components/auth-card'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    setIsLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('email', values.email)
    formData.append('password', values.password)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <AuthCard tab="login" title="Selamat datang kembali" description="Masukkan email dan password kamu">
      <OAuthButtons mode="login" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <div className={AUTH_ERROR}>{error}</div>}
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
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-semibold">Password</FormLabel>
                  <Link href="/forgot-password" className="text-[13px] font-semibold text-cd-primary hover:text-cd-primary-hover">
                    Lupa password?
                  </Link>
                </div>
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
          <Button type="submit" className={AUTH_SUBMIT} disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
      </Form>
    </AuthCard>
  )
}
