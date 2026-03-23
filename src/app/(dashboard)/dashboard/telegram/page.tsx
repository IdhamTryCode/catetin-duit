import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, CheckCircle2, XCircle } from 'lucide-react'
import { TelegramConnect } from './telegram-connect'

export default async function TelegramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', user!.id)
    .single()

  const isConnected = !!profile?.telegram_chat_id

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Hubungkan Telegram</h1>
        <p className="text-muted-foreground">Catat transaksi langsung dari chat Telegram</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-blue-500" />
              <CardTitle>Status Koneksi</CardTitle>
            </div>
            {isConnected ? (
              <Badge className="bg-green-500 text-white flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Terhubung
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Belum terhubung
              </Badge>
            )}
          </div>
          <CardDescription>
            {isConnected
              ? 'Akun Telegram kamu sudah terhubung. Kamu bisa langsung chat ke bot untuk mencatat transaksi.'
              : 'Generate kode unik di bawah, lalu kirimkan ke bot Telegram untuk menghubungkan akun.'}
          </CardDescription>
        </CardHeader>
        {!isConnected && (
          <CardContent>
            <TelegramConnect userId={user!.id} />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cara Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Catat transaksi:</p>
            <div className="bg-muted rounded p-3 space-y-1 font-mono text-xs">
              <p>💬 &quot;Beli makan siang 35rb&quot;</p>
              <p>💬 &quot;Terima transfer dari client 2jt&quot;</p>
              <p>💬 &quot;Beli bensin 50rb dan dapat gofood 500rb&quot;</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Perintah tersedia:</p>
            <div className="bg-muted rounded p-3 space-y-1 font-mono text-xs">
              <p>/riwayat — Lihat transaksi terakhir</p>
              <p>/ringkasan — Ringkasan bulan ini</p>
              <p>/bantuan — Tampilkan panduan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
