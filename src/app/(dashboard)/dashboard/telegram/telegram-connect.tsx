'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, RefreshCw, Check } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TelegramConnect({ userId }: { userId: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining === 0) {
        setCode(null)
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  async function generateCode() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/connect/generate', { method: 'POST' })
      const data = await res.json()
      if (data.code) {
        setCode(data.code)
        setExpiresAt(new Date(data.expires_at))
        setCountdown(900)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function copyCode() {
    if (!code) return
    await navigator.clipboard.writeText(`/connect ${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {!code ? (
        <Button onClick={generateCode} disabled={isLoading} className="w-full">
          {isLoading ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            'Generate Kode Koneksi'
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">Kirim perintah ini ke bot Telegram:</p>
            <p className="text-2xl font-bold font-mono tracking-widest">/connect {code}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Kadaluarsa dalam <span className="font-medium text-foreground">{formatCountdown(countdown)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyCode} variant="outline" className="flex-1">
              {copied ? (
                <><Check className="h-4 w-4 mr-2 text-green-500" /> Tersalin!</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" /> Salin Kode</>
              )}
            </Button>
            <Button onClick={generateCode} variant="outline" disabled={isLoading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Buka Telegram dan cari bot @CatetinDuitBot</li>
            <li>Klik Start atau kirim /start</li>
            <li>Kirim kode di atas ke bot</li>
            <li>Akun akan otomatis terhubung</li>
          </ol>
        </div>
      )}
    </div>
  )
}
