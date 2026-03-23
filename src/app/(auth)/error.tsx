'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Auth error boundary.
 * Catches uncaught errors inside the (auth) route group (login, register, etc.)
 * and renders a minimal recovery UI consistent with the auth page style.
 */
export default function AuthError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-6 space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Terjadi Kesalahan</h2>
            <p className="text-sm text-muted-foreground">
              Halaman ini tidak dapat dimuat. Silakan coba lagi atau kembali ke halaman masuk.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center gap-3 pb-8">
          <Button variant="outline" onClick={reset}>Coba Lagi</Button>
          <Button asChild>
            <Link href="/login">Kembali ke Masuk</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
