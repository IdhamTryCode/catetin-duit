import { Resend } from 'resend'
import { TRIAL_DURATION_DAYS, SUBSCRIPTION_PRICE } from '@/lib/constants'
import { formatIDR } from '@/lib/utils'

const resend = new Resend(process.env.RESEND_API_KEY)

// TODO: Ganti ke domain sendiri setelah verifikasi di resend.com/domains
const FROM = process.env.EMAIL_FROM ?? 'Catetin Duit <onboarding@resend.dev>'

/** Base app URL — must be set in environment variables for production emails */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

// ─── Template helpers ────────────────────────────────────────────────────────

/** Wraps email content in the standard HTML email shell (header + footer). */
function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Catetin Duit</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:24px 32px">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#3b82f6;width:32px;height:32px;border-radius:8px;text-align:center;line-height:32px;font-weight:700;font-size:14px;color:#fff">C</td>
                <td style="padding-left:12px;font-size:18px;font-weight:700;color:#fff">Catetin Duit</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:32px">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f4f4f5;background:#fafafa">
            <p style="margin:0;font-size:12px;color:#71717a;text-align:center">
              © ${new Date().getFullYear()} Catetin Duit · Dibuat untuk UMKM Indonesia
              <br/>Kamu menerima email ini karena terdaftar di <a href="${APP_URL}" style="color:#3b82f6">catetinduit.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b">${text}</h1>`
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6">${text}</p>`
}

function button(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin:8px 0 16px">${text}</a>`
}

/** Renders a shaded info box with multiple lines of text. */
function infoBox(lines: string[]) {
  const items = lines.map(l => `<tr><td style="padding:6px 0;font-size:14px;color:#3f3f46">${l}</td></tr>`).join('')
  return `<table style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%">${items}</table>`
}

// ─── Email senders ────────────────────────────────────────────────────────────

/**
 * Send a welcome email to a new user after registration.
 * @param to - Recipient email address
 * @param name - User's full name (first name extracted internally)
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const firstName = name.split(' ')[0]
  const html = baseLayout(`
    ${h1(`Selamat datang, ${firstName}! 🎉`)}
    ${p('Akun Catetin Duit kamu sudah siap. Mulai catat keuangan lebih mudah dengan menghubungkan Telegram kamu.')}
    ${infoBox([
      `✅ Trial gratis <strong>${TRIAL_DURATION_DAYS} hari</strong> sudah aktif`,
      '📱 Hubungkan Telegram untuk mulai mencatat',
      '📊 Dashboard web sudah bisa diakses',
    ])}
    ${p('Langkah pertama: hubungkan akun Telegram kamu ke bot Catetin Duit.')}
    ${button('Hubungkan Telegram Sekarang', `${APP_URL}/dashboard/telegram`)}
    ${p('<small style="color:#71717a">Setelah terhubung, cukup chat ke bot untuk mencatat transaksi kapanpun dan dimanapun.</small>')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Selamat datang di Catetin Duit, ${firstName}!`,
    html,
  })
}

/**
 * Send a trial expiry reminder email (H-3 or H-1).
 * @param to - Recipient email address
 * @param name - User's full name
 * @param daysLeft - Number of days remaining (3 or 1)
 * @param trialEndsAt - ISO date string of trial end date
 */
export async function sendTrialReminderEmail(to: string, name: string, daysLeft: number, trialEndsAt: string) {
  const firstName = name.split(' ')[0]
  const formattedDate = new Date(trialEndsAt).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const priceFormatted = formatIDR(SUBSCRIPTION_PRICE)

  const html = baseLayout(`
    ${h1(`Trial kamu berakhir ${daysLeft === 1 ? 'besok' : `dalam ${daysLeft} hari`} ⏰`)}
    ${p(`Halo ${firstName}, trial gratis kamu akan berakhir pada <strong>${formattedDate}</strong>.`)}
    ${p('Setelah trial berakhir, kamu tidak bisa lagi mencatat via Telegram. Upgrade ke Premium untuk tetap bisa mencatat tanpa batas.')}
    ${infoBox([
      `💎 Premium: ${priceFormatted}/bulan`,
      '✅ Pencatatan via Telegram tanpa batas',
      '📊 Dashboard & laporan lengkap',
      '🔒 Data tersimpan selamanya',
    ])}
    ${button('Upgrade ke Premium', `${APP_URL}/dashboard/subscription`)}
    ${p('<small style="color:#71717a">Tidak ingin lanjut? Data kamu tetap aman, kamu bisa akses dashboard web selama 30 hari.</small>')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `⏰ Trial Catetin Duit berakhir ${daysLeft === 1 ? 'besok' : `dalam ${daysLeft} hari`}`,
    html,
  })
}

/**
 * Send an email notifying the user that their trial has expired.
 * @param to - Recipient email address
 * @param name - User's full name
 */
export async function sendTrialExpiredEmail(to: string, name: string) {
  const firstName = name.split(' ')[0]
  const priceFormatted = formatIDR(SUBSCRIPTION_PRICE)
  const html = baseLayout(`
    ${h1('Trial kamu sudah berakhir 😔')}
    ${p(`Halo ${firstName}, trial gratis kamu sudah berakhir. Pencatatan via Telegram untuk saat ini dinonaktifkan.`)}
    ${p(`Tapi tenang! Upgrade ke Premium hanya ${priceFormatted}/bulan dan semua fitur langsung aktif kembali.`)}
    ${infoBox([
      `💎 Harga: ${priceFormatted}/bulan`,
      '⚡ Aktivasi instan setelah pembayaran',
      '📱 Telegram langsung aktif kembali',
    ])}
    ${button('Upgrade Premium Sekarang', `${APP_URL}/dashboard/subscription`)}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: '😔 Trial Catetin Duit kamu sudah berakhir',
    html,
  })
}

/**
 * Send a payment success confirmation email.
 * @param to - Recipient email address
 * @param name - User's full name
 * @param amount - Amount paid in IDR
 * @param reference - Duitku payment reference number
 * @param subscriptionEndsAt - ISO date string when premium ends
 */
export async function sendPaymentSuccessEmail(
  to: string,
  name: string,
  amount: number,
  reference: string,
  subscriptionEndsAt: string,
) {
  const firstName = name.split(' ')[0]
  const formattedAmount = formatIDR(amount)
  const formattedDate = new Date(subscriptionEndsAt).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const html = baseLayout(`
    ${h1('Pembayaran berhasil! 🎉')}
    ${p(`Halo ${firstName}, pembayaran Premium Catetin Duit kamu berhasil diproses.`)}
    ${infoBox([
      `💳 Nomor referensi: <strong>${reference}</strong>`,
      `💰 Nominal: <strong>${formattedAmount}</strong>`,
      `📅 Premium aktif hingga: <strong>${formattedDate}</strong>`,
      `✅ Status: <strong>Berhasil</strong>`,
    ])}
    ${p('Bot Telegram kamu sudah aktif kembali. Selamat mencatat! 💪')}
    ${button('Lihat Dashboard', `${APP_URL}/dashboard`)}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: '✅ Pembayaran Premium Catetin Duit berhasil',
    html,
  })
}

/**
 * Send a payment failure notification email.
 * @param to - Recipient email address
 * @param name - User's full name
 */
export async function sendPaymentFailedEmail(to: string, name: string) {
  const firstName = name.split(' ')[0]
  const html = baseLayout(`
    ${h1('Pembayaran tidak berhasil ❌')}
    ${p(`Halo ${firstName}, sayangnya pembayaran kamu tidak berhasil diproses.`)}
    ${p('Jangan khawatir — silakan coba lagi. Jika masalah berlanjut, hubungi kami.')}
    ${button('Coba Bayar Lagi', `${APP_URL}/dashboard/subscription`)}
    ${p('<small style="color:#71717a">Butuh bantuan? Balas email ini dan tim kami siap membantu.</small>')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: '❌ Pembayaran Catetin Duit tidak berhasil',
    html,
  })
}

/**
 * Send a premium expiry reminder email (H-3 or H-1).
 * @param to - Recipient email address
 * @param name - User's full name
 * @param daysLeft - Number of days remaining (3 or 1)
 * @param subscriptionEndsAt - ISO date string when subscription ends
 */
export async function sendPremiumExpiringEmail(to: string, name: string, daysLeft: number, subscriptionEndsAt: string) {
  const firstName = name.split(' ')[0]
  const formattedDate = new Date(subscriptionEndsAt).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const priceFormatted = formatIDR(SUBSCRIPTION_PRICE)

  const html = baseLayout(`
    ${h1(`Premium berakhir dalam ${daysLeft} hari ⏰`)}
    ${p(`Halo ${firstName}, langganan Premium kamu akan berakhir pada <strong>${formattedDate}</strong>.`)}
    ${p('Perpanjang sekarang untuk memastikan pencatatan keuanganmu tidak terganggu.')}
    ${infoBox([
      `💎 Perpanjang: ${priceFormatted}/bulan`,
      '⚡ Aktif langsung setelah pembayaran',
    ])}
    ${button('Perpanjang Premium', `${APP_URL}/dashboard/subscription`)}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `⏰ Premium Catetin Duit berakhir dalam ${daysLeft} hari`,
    html,
  })
}
