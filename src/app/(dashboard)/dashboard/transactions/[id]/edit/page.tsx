import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CARD, PageHeader } from '@/components/dashboard/ui'
import { TransactionForm } from '../../transaction-form'
import { type Category } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTransactionPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the transaction — verify ownership via user_id filter
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, amount, type, description, category_id, transaction_date')
    .eq('id', (await params).id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!transaction) notFound()

  // Fetch categories: default ones + user's own
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
      <PageHeader title="Edit Transaksi" subtitle="Ubah detail transaksi ini" />

      <div className={`${CARD} p-6`}>
          <TransactionForm
            categories={(categories ?? []) as Category[]}
            initialValues={{
              id: transaction.id,
              amount: Number(transaction.amount),
              type: transaction.type as 'income' | 'expense',
              description: transaction.description,
              category_id: transaction.category_id,
              transaction_date: transaction.transaction_date,
            }}
          />
      </div>
    </div>
  )
}
