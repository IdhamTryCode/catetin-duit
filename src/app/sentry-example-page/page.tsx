'use client'

import { useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SentryTestPage() {
  const [lastSent, setLastSent] = useState<string | null>(null)

  function triggerFrontendError() {
    try {
      throw new Error('[TEST] CatetinDuit frontend error — Sentry is working!')
    } catch (e) {
      Sentry.captureException(e)
      setLastSent('Frontend error terkirim ke Sentry!')
    }
  }

  function triggerUnhandledError() {
    throw new Error('[TEST] Unhandled error — Sentry should catch this automatically!')
  }

  function triggerLog() {
    Sentry.logger.info('Test log dari CatetinDuit', { page: 'sentry-test', timestamp: new Date().toISOString() })
    setLastSent('Log terkirim ke Sentry!')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🔍 Sentry Test Page</CardTitle>
          <CardDescription>
            Halaman ini hanya untuk test koneksi Sentry. Hapus sebelum launch ke production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lastSent && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm text-green-700 dark:text-green-300">
              ✅ {lastSent} Cek dashboard: sentry.io
            </div>
          )}

          <Button onClick={triggerFrontendError} className="w-full" variant="outline">
            Kirim Error ke Sentry (handled)
          </Button>

          <Button onClick={triggerLog} className="w-full" variant="outline">
            Kirim Log ke Sentry
          </Button>

          <Button onClick={triggerUnhandledError} className="w-full" variant="destructive">
            Trigger Unhandled Error (page crash)
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Setelah klik, buka{' '}
            <a
              href="https://sentry.io"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              sentry.io
            </a>{' '}
            → Issues untuk lihat hasilnya
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
