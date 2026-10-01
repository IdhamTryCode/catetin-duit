'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { clientIp, rateLimitDb } from '@/lib/rate-limit'

async function getAppUrl() {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

const TOO_MANY = 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.'

/**
 * Semua permintaan auth lewat server ini, jadi Supabase melihat IP Vercel,
 * bukan IP pengguna — batas bawaannya tidak efektif. Kita batasi sendiri:
 * per IP (banjir dari satu sumber) dan per email (tebak password satu akun
 * dari banyak IP). Mengembalikan false jika salah satu batas terlampaui.
 */
async function withinLimits(checks: [key: string, max: number, windowSeconds: number][]): Promise<boolean> {
  const results = await Promise.all(checks.map(([key, max, win]) => rateLimitDb(key, max, win)))
  return results.every(Boolean)
}

const normEmail = (v: FormDataEntryValue | string | null) => String(v ?? '').trim().toLowerCase().slice(0, 254)

export async function login(formData: FormData) {
  const supabase = await createClient()
  const ip = clientIp(await headers())

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const email = normEmail(data.email)
  const ok = await withinLimits([
    [`login:ip:${ip}`, 20, 300],                // 20 percobaan / 5 menit per IP
    [`login:pair:${ip}:${email}`, 8, 900],      // 8 / 15 menit per IP+email
    [`login:email:${email}`, 30, 900],          // 30 / 15 menit per email (serangan terdistribusi)
  ])
  if (!ok) return { error: TOO_MANY }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: loginErrorMessage(error.message), unconfirmed: /not confirmed/i.test(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

/** Pesan error login Supabase yang umum, dalam Bahasa Indonesia. */
function loginErrorMessage(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Email atau password salah.'
  if (/not confirmed/i.test(message)) {
    return 'Email kamu belum dikonfirmasi. Buka link konfirmasi di inbox (cek juga folder spam), lalu masuk lagi.'
  }
  return message
}

/**
 * Daftar dengan email. Hasil:
 * - `{ error }` jika gagal, termasuk email yang sudah terdaftar
 * - `{ needsConfirmation: true, email }` jika Supabase meminta konfirmasi email
 * - redirect ke /dashboard jika konfirmasi email dimatikan (sesi langsung ada)
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()
  const appUrl = await getAppUrl()

  // 5 pendaftaran / jam per IP: cegah pembuatan akun massal & spam email konfirmasi
  if (!(await withinLimits([[`signup:ip:${clientIp(await headers())}`, 5, 3600]]))) return { error: TOO_MANY }

  const email = (formData.get('email') as string).trim().toLowerCase()
  const fullName = ((formData.get('full_name') as string) ?? '').trim()

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password: formData.get('password') as string,
    options: {
      data: { full_name: fullName },
      // Link di email konfirmasi kembali ke domain ini, lalu masuk ke dashboard.
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { error: EMAIL_TAKEN }
    return { error: error.message }
  }

  // Supabase tidak mengembalikan error untuk email yang sudah terdaftar (anti
  // enumerasi); tandanya user tanpa identity. Jangan kirim welcome email lagi.
  if (authData.user && authData.user.identities?.length === 0) {
    return { error: EMAIL_TAKEN }
  }

  if (authData.user) {
    sendWelcomeEmail(email, fullName || email).catch(() => {})
  }

  if (authData.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  return { needsConfirmation: true, email }
}

const EMAIL_TAKEN = 'Email ini sudah terdaftar. Silakan masuk, atau pakai "Lupa password" kalau lupa kata sandi.'

/** Kirim ulang email konfirmasi pendaftaran. */
export async function resendConfirmation(email: string) {
  const supabase = await createClient()
  const appUrl = await getAppUrl()

  const ok = await withinLimits([
    [`resend:email:${normEmail(email)}`, 3, 600],
    [`resend:ip:${clientIp(await headers())}`, 10, 3600],
  ])
  if (!ok) return { error: TOO_MANY }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  })
  if (error) {
    if (/security purposes|rate limit/i.test(error.message)) return { error: 'Tunggu sebentar sebelum meminta email lagi.' }
    return { error: error.message }
  }
  return { success: true }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const appUrl = await getAppUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithGitHub() {
  const supabase = await createClient()
  const appUrl = await getAppUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Email wajib diisi' }

  const supabase = await createClient()
  const appUrl = await getAppUrl()

  // Cegah bom email reset ke satu alamat / dari satu IP
  const ok = await withinLimits([
    [`forgot:email:${normEmail(email)}`, 3, 3600],
    [`forgot:ip:${clientIp(await headers())}`, 5, 3600],
  ])
  if (!ok) return { error: TOO_MANY }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/reset-password`,
  })

  if (error) return { error: error.message }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  if (!password || password.length < 8) {
    return { error: 'Password minimal 8 karakter' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
