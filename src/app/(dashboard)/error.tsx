'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Dashboard error boundary.
 * Catches uncaught errors inside the (dashboard) route group,
 * reports them to Sentry, and renders a user-friendly recovery UI.
 */
export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-6 space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Terjadi Kesalahan</h2>
            <p className="text-sm text-muted-foreground">
              Halaman ini mengalami masalah. Tim kami sudah diberitahu secara otomatis.
            </p>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 inline-block">
              Kode: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center gap-3 pb-8">
          <Button variant="outline" onClick={() => window.history.back()}>
            Kembali
          </Button>
          <Button onClick={reset}>Coba Lagi</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
