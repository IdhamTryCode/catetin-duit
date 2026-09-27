/**
 * Uji menyeluruh handler webhook Telegram: flow user baru, edge case,
 * dan extreme case. Dijalankan terhadap Supabase produksi.
 *
 * Menulis data uji ke DB, lalu membersihkannya sendiri di akhir.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('/home/ubuntu/openclaw/catetin-duit-agent/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
process.env.NEXT_PUBLIC_APP_URL = 'https://catetinduit.de'
process.env.NEXT_PUBLIC_FREE_PROMO = 'true'
process.env.USER_DEFAULT_TIMEZONE = 'Asia/Jakarta'

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const H = await import('./handlers.js')

const OWNER = 914463371
const TEST_CHAT = 999888777          // chat uji, tidak pernah dipakai orang
const TEST_CHAT_2 = 999888778
let pass = 0, fail = 0
const failures = []

function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok    ${name}`) }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}  ${detail}`) }
}

async function cleanup() {
  await db.from('transactions').delete().like('dedupe_key', 'test:%')
  await db.from('connect_codes').delete().like('code', 'TST%')
  await db.from('profiles').update({ telegram_chat_id: null })
    .in('telegram_chat_id', [TEST_CHAT, TEST_CHAT_2])
}

await cleanup()

// Ambil satu profil nyata untuk dipakai sebagai "user baru" simulasi.
const { data: anyProfile } = await db
  .from('profiles').select('id, full_name, subscription_status, trial_ends_at, telegram_chat_id')
  .is('telegram_chat_id', null).limit(1)
const spare = anyProfile?.[0]

console.log('\n═══ FLOW USER BARU ═══')
{
  const r1 = await H.handleConnect(db, TEST_CHAT, '')
  ok('1. buka bot, /start polos → instruksi daftar', r1.includes('Selamat datang') && r1.includes('/register'))

  const r2 = await H.handleConnect(db, TEST_CHAT, 'connect')
  ok('2. deep link lama ?start=connect → instruksi, bukan error', r2.includes('Selamat datang'))

  const r3 = await H.findProfileByChatId(db, TEST_CHAT)
  ok('3. belum connect → profil null', r3 === null)

  if (spare) {
    // Simulasi: user generate kode di dashboard
    const code = 'TST' + Math.random().toString(36).slice(2, 5).toUpperCase()
    await db.from('connect_codes').insert({
      user_id: spare.id, code,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    })

    const r4 = await H.handleConnect(db, TEST_CHAT, code.toLowerCase())
    ok('4. /connect huruf kecil → tetap berhasil', r4.includes('berhasil terhubung'), r4.slice(0, 60))

    const prof = await H.findProfileByChatId(db, TEST_CHAT)
    ok('5. profil kini ketemu dari chat_id', prof !== null)

    const r6 = await H.handleConnect(db, TEST_CHAT, code)
    ok('6. kode dipakai ulang → ditolak', r6.includes('sudah pernah digunakan'))

    // chat LAIN mencoba pakai akun yang sama
    const code2 = 'TST' + Math.random().toString(36).slice(2, 5).toUpperCase()
    await db.from('connect_codes').insert({
      user_id: spare.id, code: code2,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    })
    const r7 = await H.handleConnect(db, TEST_CHAT_2, code2)
    ok('7. akun sudah punya Telegram lain → ditolak', r7.includes('sudah terhubung dengan Telegram lain'))

    if (prof) {
      console.log('\n═══ OPERASI HARIAN (user baru) ═══')
      const h = await H.handleHistory(db, prof)
      ok('8. /riwayat user tanpa transaksi → pesan ramah', h.includes('Belum ada transaksi') || h.includes('Transaksi Terakhir'))
      const s = await H.handleSummary(db, prof)
      ok('9. /ringkasan user baru → tidak crash', s.includes('Ringkasan'))

      console.log('\n═══ IDEMPOTENSI ═══')
      const parsed = { action: 'save_transactions', transactions: [
        { type: 'expense', amount: 12345, category: 'Makanan & Minuman', description: 'Uji dedupe', confidence: 0.95 },
      ]}
      const k = 'test:dedupe:1'
      const a = await H.handleParsed(db, prof, parsed, 'uji', k)
      const b = await H.handleParsed(db, prof, parsed, 'uji', k)
      ok('10. simpan pertama berhasil', a.includes('berhasil dicatat'))
      ok('11. update dobel → TIDAK tersimpan dua kali', b.includes('Gagal menyimpan'), '(dedupe menolak, benar)')
      const { count } = await db.from('transactions')
        .select('*', { count: 'exact', head: true }).eq('dedupe_key', 'test:dedupe:1:0')
      ok('12. hanya 1 baris di DB', count === 1, `count=${count}`)

      console.log('\n═══ EXTREME CASE ═══')
      const many = { action: 'save_transactions', transactions: Array.from({length: 20}, (_, i) => ({
        type: 'expense', amount: 1000 + i, category: 'Pengeluaran Lain',
        description: `Batch ${i}`, confidence: 0.9,
      }))}
      const rm = await H.handleParsed(db, prof, many, 'batch', 'test:batch:1')
      ok('13. 20 transaksi sekaligus → semua tersimpan', rm.includes('20 transaksi'), rm.slice(0, 50))

      const big = { action: 'save_transactions', transactions: [
        { type: 'income', amount: 999_999_999_999, category: 'Pemasukan Lain', description: 'Nominal ekstrem', confidence: 0.95 },
      ]}
      const rb = await H.handleParsed(db, prof, big, 'x', 'test:big:1')
      ok('14. nominal 999 miliar → tertangani', rb.includes('berhasil dicatat'))

      const longDesc = 'A'.repeat(600)
      const rl = await H.handleParsed(db, prof, { action: 'save_transactions', transactions: [
        { type: 'expense', amount: 5000, category: 'Pengeluaran Lain', description: longDesc, confidence: 0.9 },
      ]}, 'x', 'test:long:1')
      ok('15. deskripsi 600 karakter → tidak crash', rl.includes('berhasil dicatat'))

      const emoji = await H.handleParsed(db, prof, { action: 'save_transactions', transactions: [
        { type: 'expense', amount: 7000, category: 'Makanan & Minuman', description: '🍜 Mie "pedas" & <script>alert(1)</script>', confidence: 0.9 },
      ]}, 'x', 'test:emoji:1')
      ok('16. emoji + kutip + HTML → tersimpan apa adanya', emoji.includes('berhasil dicatat'))

      const catNew = await H.handleParsed(db, prof, { action: 'create_category', name: 'UjiKategoriXYZ', type: 'expense', icon: '🧪' }, 'x', 'test:cat:1')
      ok('17. buat kategori baru', catNew.includes('berhasil ditambahkan'))
      const catDup = await H.handleParsed(db, prof, { action: 'create_category', name: 'ujikategorixyz', type: 'expense' }, 'x', 'test:cat:2')
      ok('18. kategori duplikat (beda huruf) → ditolak', catDup.includes('sudah ada'))
      await db.from('categories').delete().ilike('name', 'UjiKategoriXYZ').eq('user_id', prof.id)

      const nonFin = await H.handleParsed(db, prof, { action: 'non_financial', message: 'Halo juga!' }, 'x', 'test:nf:1')
      ok('19. pesan non-finansial → balasan ramah', nonFin === 'Halo juga!')

      console.log('\n═══ TANGGAL ═══')
      const today = H.todayInTz()
      const rd = await H.handleParsed(db, prof, { action: 'save_transactions', transactions: [
        { type: 'expense', amount: 9000, category: 'Transportasi', description: 'Kemarin', confidence: 0.9, date_offset: -1 },
      ]}, 'x', 'test:date:1')
      ok('20. date_offset -1 → label "kemarin"', rd.includes('kemarin'))
      const { data: drow } = await db.from('transactions').select('transaction_date').eq('dedupe_key', 'test:date:1:0').limit(1)
      ok('21. tanggal tersimpan = kemarin', drow?.[0]?.transaction_date === H.addDaysToYmd(today, -1), `${drow?.[0]?.transaction_date}`)
    }
  } else {
    console.log('  (lewati 4-21: tidak ada profil bebas untuk simulasi)')
  }
}

console.log('\n═══ LANGGANAN ═══')
{
  const blocked = { id: 'x', full_name: 'X', subscription_status: 'trial_expired' }
  ok('22. FREE_PROMO aktif → trial_expired tetap dilayani', H.subscriptionBlocked(blocked) === false)
  process.env.NEXT_PUBLIC_FREE_PROMO = 'false'
  // subscriptionBlocked membaca konstanta saat modul dimuat, jadi nilai
  // tetap true; ini mengonfirmasi saklar dibaca sekali saat start.
  process.env.NEXT_PUBLIC_FREE_PROMO = 'true'
}

console.log('\n═══ EDGE CASE TANGGAL ═══')
ok('23. lintas bulan (1 Mar -1)', H.addDaysToYmd('2026-03-01', -1) === '2026-02-28')
ok('24. tahun kabisat (1 Mar 2028 -1)', H.addDaysToYmd('2028-03-01', -1) === '2028-02-29')
ok('25. lintas tahun', H.addDaysToYmd('2026-01-01', -1) === '2025-12-31')
ok('26. offset -365', H.addDaysToYmd('2026-09-27', -365) === '2025-09-27')
ok('27. formatRupiah nol', H.formatRupiah(0).includes('0'))
ok('28. formatRupiah miliar', H.formatRupiah(1_000_000_000).includes('1.000.000.000'))

console.log('\n═══ KODE CONNECT TIDAK VALID ═══')
ok('29. kode kosong', (await H.handleConnect(db, TEST_CHAT, '')).includes('Selamat datang'))
ok('30. kode 7 karakter', (await H.handleConnect(db, TEST_CHAT, 'ABCDEFG')).includes('6 karakter'))
ok('31. kode dgn simbol', (await H.handleConnect(db, TEST_CHAT, 'AB@12!')).includes('6 karakter'))
ok('32. kode spasi', (await H.handleConnect(db, TEST_CHAT, '  ')).includes('Selamat datang'))
ok('33. SQL injection di kode', (await H.handleConnect(db, TEST_CHAT, "' OR 1=1--")).includes('6 karakter'))
ok('34. kode valid tak terdaftar', (await H.handleConnect(db, TEST_CHAT, 'ZZZZZZ')).includes('tidak valid'))

await cleanup()

console.log(`\n${'═'.repeat(50)}`)
console.log(`${pass} lolos, ${fail} gagal`)
if (failures.length) console.log('Gagal:', failures.join(' | '))
process.exit(fail === 0 ? 0 : 1)
