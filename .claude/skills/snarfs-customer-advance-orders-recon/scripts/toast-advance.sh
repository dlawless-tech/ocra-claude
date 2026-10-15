#!/bin/bash
# Pull Toast payments whose paid day differs from their order day, in 2-week paid-date chunks.
# usage: toast-advance.sh <session> <start YYYY-MM-DD> <end YYYY-MM-DD> <out.json>
# Chunks already pulled are kept as toast-chunk-<MM-DD-YYYY>.json, so a rerun resumes; delete them for a fresh pull.
set -u
S="$1"; START="$2"; END="$3"; OUT="$4"; D=$(dirname "$0")
H=$(playwright-cli -s=$S eval "() => location.hostname" 2>&1 | sed -n '/### Result/{n;p;q;}' | tr -d '"')
[ "$H" = "www.toasttab.com" ] || { echo "FAIL: Toast is signed out ($H); the human signs in to the open window"; exit 1; }
# the report endpoint needs a legacy reports page as origin
playwright-cli -s=$S eval "() => location.pathname" 2>&1 | grep -q 'reports/home\|legacyReports' || { playwright-cli -s=$S goto "https://www.toasttab.com/restaurants/admin/legacyReports/sales#sales-payments" >/dev/null 2>&1; sleep 20; }
CHUNKS=$(node -e 'let [s,e]=process.argv.slice(1).map(x=>new Date(x+"T12:00:00Z"));const f=d=>(d.getUTCMonth()+1+"").padStart(2,"0")+"-"+(d.getUTCDate()+"").padStart(2,"0")+"-"+d.getUTCFullYear();while(s<=e){const t=new Date(Math.min(+s+13*864e5,+e));console.log(f(s)+":"+f(t));s=new Date(+t+864e5)}' "$START" "$END")
for C in $CHUNKS; do
  A=${C%%:*}; B=${C##*:}
  [ -f toast-chunk-$A.json ] && continue
  sed -e "s/__START__/$A/g" -e "s/__END__/$B/g" "$D/toast-advance.js" > toast-advance.run.js
  # merged rows stay on the page, so each try picks up the dates the last one missed
  OK=""
  for TRY in 1 2 3; do
    playwright-cli -s=$S eval "$(cat toast-advance.run.js)" > toast.raw.txt 2>&1
    node -e 'const t=require("fs").readFileSync("toast.raw.txt","utf8");const m=t.match(/### Result\n([\s\S]*?)\n### Ran/);if(!m){console.log("try '"$TRY"': "+t.replace(/[║╔╚═]/g,"").trim().slice(0,300));process.exit(1)}const s=JSON.parse(m[1]);if(/^FAIL/.test(s)){console.log("try '"$TRY"': "+s);process.exit(1)}const j=JSON.parse(s);require("fs").writeFileSync("toast-chunk-'"$A"'.json",JSON.stringify(j.advance));console.log("'"$A"' to '"$B"': "+j.rows+" payments, "+j.advance.length+" off-day")' && { OK=1; break; }
  done
  [ -n "$OK" ] || { echo "FAIL: chunk $A to $B"; exit 1; }
done
node -e 'const fs=require("fs");const a=[].concat(...fs.readdirSync(".").filter(f=>/^toast-chunk-/.test(f)).map(f=>JSON.parse(fs.readFileSync(f))));fs.writeFileSync(process.argv[1],JSON.stringify(a));console.log("saved",a.length,"off-day payments to",process.argv[1])' "$OUT"
