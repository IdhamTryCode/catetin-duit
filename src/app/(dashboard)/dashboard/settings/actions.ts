'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { isValidTimezone } from '@/lib/utils'

/**
 * Update the authenticated user's profile (name and timezone).
 * Validates timezone at runtime before persisting to the database.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const full_name = formData.get('full_name') as string
  const timezone = formData.get('timezone') as string

  if (!isValidTimezone(timezone)) {
    return { error: 'Zona waktu tidak valid' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Disconnect the authenticated user's Telegram account.
 * Sets telegram_chat_id to null in the profiles table.
 */
export async function disconnectTelegram() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase
    .from('profiles')
    .update({ telegram_chat_id: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/telegram')
}
