# Uji Telegram bot

Dijalankan terhadap Supabase produksi. Data uji dibersihkan sendiri
(dedupe_key `test:%`, kode `TST%`, chat_id 999888777/999888778).

```bash
# build modul yang diuji
npx esbuild src/lib/telegram/handlers.ts --bundle --platform=node \
  --format=esm --external:@supabase/supabase-js --outfile=dist-test/handlers.js
npx esbuild src/lib/telegram/parse.ts --bundle --platform=node \
  --format=esm --external:zod --outfile=dist-test/parse.js
cp test/telegram/*.mjs dist-test/

node dist-test/suite.mjs        # 34 kasus: flow user baru, idempotensi, edge case
node dist-test/parse-suite.mjs  # 16 kasus parser LLM (butuh LLM_API_KEY)
```

`suite.mjs` membaca kredensial Supabase dari
`~/openclaw/catetin-duit-agent/.env`. `parse-suite.mjs` butuh
`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` di environment.
