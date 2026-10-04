#!/bin/bash
# Post every store in a plan from plan-week.js, one at a time.
# usage: post-week.sh <session> <plan.json> [wrong]
#   wrong: only stores plan-week.js flagged against posted entries (needs entries.json at plan time)
# Every store needs its TransactionId in the plan (the entries file supplies it).
set -u
S="$1"; PLAN="$2"; ONLY="${3:-all}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); for(const x of p){ if(process.argv[2]==="wrong"&&!(x.wrong&&x.wrong.length)) continue; if(!x.id){ console.error(x.loc+" FAIL: no TransactionId in plan"); continue; } console.log(x.loc+"\t"+x.id+"\t"+JSON.stringify(x.lines)); }' "$PLAN" "$ONLY" |
while IFS=$'\t' read -r LOC ID LINES; do
  echo "== $LOC"
  bash "$HERE/post-entry.sh" "$S" "$ID" "$LINES" < /dev/null
done
