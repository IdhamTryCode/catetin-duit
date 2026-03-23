'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { forgotPassword } from '../actions'
import { CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await forgotPassword(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setSent(true)
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <span className="text-3xl font-bold text-primary">💰 Catetin Duit</span>
          </div>
          <CardTitle className="text-2xl">Lupa Password</CardTitle>
          <CardDescription>
            Masukkan email kamu, kami akan kirim link untuk reset password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-medium">Email terkirim!</p>
              <p className="text-sm text-muted-foreground">
                Cek inbox <span className="font-medium text-foreground">{email}</span> dan klik link reset password.
                Cek juga folder spam jika tidak ada.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="kamu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Mengirim...' : 'Kirim Link Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline mx-auto">
            Kembali ke halaman masuk
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
