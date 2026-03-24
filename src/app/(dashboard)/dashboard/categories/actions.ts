'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { type Plan, PLAN_LIMITS } from '@/lib/constants'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(50, 'Nama terlalu panjang'),
  type: z.enum(['income', 'expense', 'both']),
  icon: z.string().max(10, 'Icon terlalu panjang').optional(),
})

/** Count how many custom (non-default) categories a user has */
async function getUserCategoryCount(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_default', false)
  return count ?? 0
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // ── Plan gate ─────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan
  const limit = PLAN_LIMITS[plan].customCategories

  if (limit === 0) {
    return { error: 'Kategori kustom tidak tersedia di plan Free. Upgrade ke Starter atau Premium.' }
  }

  if (limit !== Infinity) {
    const count = await getUserCategoryCount(supabase, user.id)
    if (count >= limit) {
      return { error: `Kamu sudah mencapai batas ${limit} kategori kustom untuk plan ${plan}. Upgrade ke Premium untuk kategori tak terbatas.` }
    }
  }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    icon: formData.get('icon') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    icon: parsed.data.icon ?? null,
    is_default: false,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/categories')
  revalidatePath('/dashboard/transactions/new')
  return { success: true }
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID kategori tidak ditemukan' }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    icon: formData.get('icon') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('categories')
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id) // pastikan hanya bisa edit milik sendiri

  if (error) return { error: error.message }

  revalidatePath('/dashboard/categories')
  revalidatePath('/dashboard/transactions/new')
  return { success: true }
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID kategori tidak ditemukan' }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // hanya bisa hapus milik sendiri (bukan default)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/categories')
  revalidatePath('/dashboard/transactions/new')
  return { success: true }
}
