import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TransactionForm } from '../transaction-form'
import { type Category } from '@/types'

export default async function NewTransactionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch categories: default ones (user_id IS NULL) + user's own
  const { data: categories } = await supabase
    .from('categories')
    .select('id, user_id, name, type, icon, color, is_default, created_at')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('is_default', { ascending: false })
    .order('name')

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/dashboard/transactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Tambah Transaksi</h1>
          <p className="text-muted-foreground text-sm">Catat transaksi baru secara manual</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Detail Transaksi</CardTitle>
          <CardDescription>Isi informasi transaksi di bawah ini</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm categories={(categories ?? []) as Category[]} />
        </CardContent>
      </Card>
    </div>
  )
}
