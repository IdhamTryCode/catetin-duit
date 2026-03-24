'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { updatePassword } from '@/app/(auth)/actions'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [isReady, setIsReady] = useState(false)
  const [exchangeError, setExchangeError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Exchange the PKCE code for a session on mount
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setExchangeError('Link tidak valid atau sudah kadaluarsa.')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setExchangeError('Link tidak valid atau sudah kadaluarsa. Silakan minta reset password baru.')
      } else {
        setIsReady(true)
      }
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Password tidak cocok')
      return
    }
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('password', password)
    const result = await updatePassword(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <span className="text-3xl font-bold text-primary">💰 Catetin Duit</span>
          </div>
          <CardTitle className="text-2xl">Buat Password Baru</CardTitle>
          <CardDescription>Masukkan password baru untuk akunmu</CardDescription>
        </CardHeader>
        <CardContent>
          {exchangeError ? (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-center">
              {exchangeError}
            </div>
          ) : !isReady ? (
            <div className="text-sm text-muted-foreground text-center py-4">Memverifikasi link...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password Baru</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 karakter"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium">Konfirmasi Password</label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Ulangi password baru"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
        <div className="text-muted-foreground text-sm">Memuat...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
