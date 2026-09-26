#!/usr/bin/env bash
# measure-latency.sh
#
# Ukur waktu balas bot dari log: dari "Inbound message" sampai
# "outbound send ok", plus rincian berapa yang habis di panggilan LLM.
#
# Pakai: kirim beberapa pesan ke bot dari Telegram, lalu jalankan
#   ./measure-latency.sh            # 30 menit terakhir
#   ./measure-latency.sh "2 hours ago"

set -uo pipefail
SINCE="${1:-30 minutes ago}"

journalctl --user -u openclaw-gateway --since "$SINCE" --no-pager 2>/dev/null \
| grep -E "Inbound message|outbound send ok|model-fetch|memory pressure|slow SQLite" \
| python3 -c '
import sys, re
from datetime import datetime

start = None
llm_ms = 0
llm_n = 0
warns = []
rows = []

for line in sys.stdin:
    m = re.search(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+)", line)
    if not m:
        continue
    ts = datetime.fromisoformat(m.group(1))

    if "Inbound message" in line:
        start = ts
        llm_ms = 0
        llm_n = 0
        warns = []
    elif "model-fetch" in line and start:
        e = re.search(r"elapsedMs=(\d+)", line)
        if e:
            llm_ms += int(e.group(1))
            llm_n += 1
    elif "memory pressure" in line and start:
        warns.append("memory-pressure")
    elif "slow SQLite" in line and start:
        e = re.search(r"elapsedMs=(\d+)", line)
        warns.append("sqlite-%sms" % (e.group(1) if e else "?"))
    elif "outbound send ok" in line and start:
        total = (ts - start).total_seconds()
        rows.append((start.strftime("%H:%M:%S"), total, llm_ms/1000, llm_n, warns[:]))
        start = None

if not rows:
    print("Belum ada pasangan pesan masuk/keluar pada rentang ini.")
    print("Kirim beberapa pesan ke bot dari Telegram, lalu jalankan lagi.")
    sys.exit(0)

print("%-10s %8s %9s %5s   %s" % ("waktu","total","LLM","calls","catatan"))
print("-" * 62)
for t, total, llm, n, w in rows:
    print("%-10s %7.1fs %8.1fs %5d   %s" % (t, total, llm, n, ",".join(w) or "-"))

tot = [r[1] for r in rows]
llms = [r[2] for r in rows]
print("-" * 62)
print("n=%d  median total=%.1fs  median LLM=%.1fs  overhead=%.1fs" % (
    len(tot),
    sorted(tot)[len(tot)//2],
    sorted(llms)[len(llms)//2],
    sorted(tot)[len(tot)//2] - sorted(llms)[len(llms)//2],
))
'
