'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { type Plan, PLANS } from '@/lib/constants'

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

export async function adminUpdateUserPlan(formData: FormData) {
  try {
    await requireAdminUser()
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unauthorized' }
  }

  const userId = formData.get('user_id') as string
  const plan   = formData.get('plan') as Plan

  if (!userId) return { error: 'user_id diperlukan' }
  if (!PLANS.includes(plan)) return { error: 'Plan tidak valid' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ plan })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { success: true }
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
