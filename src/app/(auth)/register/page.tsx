'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { OAuthButtons } from '../oauth-buttons'
import { signup } from '../actions'
import { AuthCard } from '@/components/auth-card'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
    }
  }

  return (
    <AuthCard
      title="Buat akun baru"
      description="Trial gratis 7 hari — tidak perlu kartu kredit"
      footer={
        <>
          <span className="text-muted-foreground">Sudah punya akun?</span>
          <Link href="/login" className="text-primary hover:underline ml-1 font-medium">
            Masuk di sini
          </Link>
        </>
      }
    >
      {/* Feature strip */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground py-1">
        <span>✓ 7 hari gratis</span>
        <span>·</span>
        <span>✓ Tanpa kartu kredit</span>
        <span>·</span>
        <span>✓ Cancel kapan saja</span>
      </div>

      <OAuthButtons mode="register" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="Nama kamu" {...field} />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="kamu@email.com" type="email" {...field} />
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Min. 8 karakter"
                      type={showPassword ? 'text' : 'password'}
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                <FormLabel>Konfirmasi Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Ulangi password"
                      type={showConfirm ? 'text' : 'password'}
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
          </Button>
        </form>
      </Form>
    </AuthCard>
  )
}
