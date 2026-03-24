'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { checkDailyTransactionLimit } from '@/lib/plan'
import { type Plan } from '@/lib/constants'
import { z } from 'zod'

const transactionSchema = z.object({
  amount: z.coerce.number().positive('Jumlah harus lebih dari 0'),
  type: z.enum(['income', 'expense']),
  description: z.string().optional(),
  category_id: z.string().uuid().optional().or(z.literal('')),
  transaction_date: z.string(),
})

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // ── Enforce daily transaction limit based on user's plan ──────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan
  const { allowed, used, limit } = await checkDailyTransactionLimit(supabase, user.id, plan)

  if (!allowed) {
    return {
      error: `Batas transaksi harian plan ${plan} sudah tercapai (${used}/${limit}). Upgrade plan untuk menambah lebih banyak transaksi.`,
    }
  }

  const parsed = transactionSchema.safeParse({
    amount: formData.get('amount'),
    type: formData.get('type'),
    description: formData.get('description'),
    category_id: formData.get('category_id'),
    transaction_date: formData.get('transaction_date'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    amount: parsed.data.amount,
    type: parsed.data.type,
    description: parsed.data.description || null,
    category_id: parsed.data.category_id || null,
    transaction_date: parsed.data.transaction_date,
    source: 'web',
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transactions')
  redirect('/dashboard/transactions')
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string
  const parsed = transactionSchema.safeParse({
    amount: formData.get('amount'),
    type: formData.get('type'),
    description: formData.get('description'),
    category_id: formData.get('category_id'),
    transaction_date: formData.get('transaction_date'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('transactions')
    .update({
      amount: parsed.data.amount,
      type: parsed.data.type,
      description: parsed.data.description || null,
      category_id: parsed.data.category_id || null,
      transaction_date: parsed.data.transaction_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transactions')
  redirect('/dashboard/transactions')
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string

  await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transactions')
}
