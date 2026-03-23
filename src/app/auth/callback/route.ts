import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const meta = data.user.user_metadata

      // Ambil nama dari metadata OAuth (Google kirim 'name', GitHub kirim 'name' atau 'user_name')
      const oauthName: string =
        meta?.full_name ??
        meta?.name ??
        meta?.preferred_username ??
        meta?.user_name ??
        ''

      // Sync nama ke profil jika masih kosong
      if (oauthName) {
        await supabase
          .from('profiles')
          .update({ full_name: oauthName, updated_at: new Date().toISOString() })
          .eq('id', data.user.id)
          .or('full_name.is.null,full_name.eq.')
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
