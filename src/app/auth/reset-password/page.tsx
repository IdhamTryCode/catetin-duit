'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/app/(auth)/actions'

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

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
    // Jika sukses, updatePassword akan redirect ke /dashboard
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
        </CardContent>
      </Card>
    </div>
  )
}
