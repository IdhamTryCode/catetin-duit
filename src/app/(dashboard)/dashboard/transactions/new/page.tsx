import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CARD, PageHeader } from '@/components/dashboard/ui'
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
    <div className="flex max-w-lg flex-col gap-5">
      <Link href="/dashboard/transactions" className="text-sm font-semibold text-cd-primary hover:text-cd-primary-hover">
        ← Kembali ke Transaksi
      </Link>
      <PageHeader title="Tambah Transaksi" subtitle="Catat transaksi baru secara manual" />

      <div className={`${CARD} p-6`}>
          <TransactionForm categories={(categories ?? []) as Category[]} />
      </div>
    </div>
  )
}
