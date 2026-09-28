'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { addDays } from 'date-fns'
import { SUBSCRIPTION_DURATION_DAYS } from '@/lib/constants'

/** Verify the calling user is an admin before performing any mutation */
async function requireAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

const ADMIN_STATUSES = ['trial', 'premium', 'trial_expired', 'grace_period', 'cancelled'] as const

/**
 * Ubah status langganan user. Memilih 'premium' = aktivasi manual setelah
 * pembayaran via WhatsApp: diperpanjang SUBSCRIPTION_DURATION_DAYS dari
 * tanggal berakhir yang masih berjalan (atau dari sekarang).
 */
export async function adminUpdateUserStatus(formData: FormData) {
  try {
    await requireAdminUser()
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unauthorized' }
  }

  const userId = formData.get('user_id') as string
  const status = formData.get('status') as (typeof ADMIN_STATUSES)[number]

  if (!userId) return { error: 'user_id diperlukan' }
  if (!ADMIN_STATUSES.includes(status)) return { error: 'Status tidak valid' }

  const admin = createAdminClient()
  const now = new Date()
  const update: Record<string, string> = { subscription_status: status, updated_at: now.toISOString() }

  if (status === 'premium') {
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_status, subscription_ends_at')
      .eq('id', userId)
      .single()
    const currentEnd = profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null
    const base = currentEnd && currentEnd > now ? currentEnd : now
    update.subscription_ends_at = addDays(base, SUBSCRIPTION_DURATION_DAYS).toISOString()
    if (profile?.subscription_status !== 'premium') update.subscription_started_at = now.toISOString()
  }

  const { error } = await admin.from('profiles').update(update).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { success: true, subscription_ends_at: update.subscription_ends_at ?? null }
}

export async function adminUpdateUserRole(formData: FormData) {
  try {
    await requireAdminUser()
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unauthorized' }
  }

  const userId = formData.get('user_id') as string
  const role   = formData.get('role') as 'user' | 'admin'

  if (!userId) return { error: 'user_id diperlukan' }
  if (!['user', 'admin'].includes(role)) return { error: 'Role tidak valid' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}
