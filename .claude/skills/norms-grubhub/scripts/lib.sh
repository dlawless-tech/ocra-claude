# Shared by duplicate-post.sh and edit-entry.sh; source it after setting HERE and LOC.
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "$LOC FAIL: $*"; exit 1; }

# readback <session> <work> <loc> <date>: exit 0 when the date, the number and every work line match the page
readback() {
  local V; V=$(playwright-cli -s=$1 eval "$(cat "$HERE/read-model.js")" 2>&1 | res)
  echo "$3 readback $V"
  node -e 'const w=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.loc===process.argv[2]);let v=JSON.parse(process.argv[3]);if(typeof v==="string")v=JSON.parse(v);if(v.date!==process.argv[4]||v.num!=="GrubHub")process.exit(2);for(const l of w.lines){const r=v.rows.find(r=>r[0]===l.comment);const e=l.col==="debit"?[l.amount,0]:[0,l.amount];if(!r||Math.abs(r[1]-e[0])>0.005||Math.abs(r[2]-e[1])>0.005)process.exit(3);}' "$2" "$3" "$V" "$4"
}

# approve <session> <id>: real clicks, then the Transaction/Approve response must name the id
approve() {
  local N A
  playwright-cli -s=$1 click '#Approve > a' >/dev/null 2>&1; sleep 2
  playwright-cli -s=$1 click 'li[data-testid="approveMenuItem"]' >/dev/null 2>&1; sleep 10
  N=$(playwright-cli -s=$1 requests 2>&1 | grep "Transaction/Approve" | tail -1 | grep -oE "^[0-9]+")
  A=$( [ -n "$N" ] && playwright-cli -s=$1 response-body $N 2>&1 | grep -o '"message":"[^"]*","transactions":\[{"id":"[^"]*"')
  case "$A" in *"Successfully Approved."*"$2"*) return 0;; *) echo "approve response: $A"; return 1;; esac
}
