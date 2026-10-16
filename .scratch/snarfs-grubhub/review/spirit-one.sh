#!/bin/bash
# usage (from repo root): spirit-one.sh <session> <YYYY-MM-DD> <TransactionId>
set -u
S=$1; DT=$2; ID=$3; W=.scratch/snarfs-grubhub/review; K=.claude/skills/snarfs-grubhub/scripts; N=.scratch/snarfs-grubhub
R=$W/spirit/$DT; mkdir -p $R
bash $K/read-entry.sh $S $ID > $R/entry.json || { echo "Spirit $DT FAIL read"; exit 1; }
node $K/spirit-work.js $W/spirit-plan.json $DT $R/entry.json > $R/rec.json
grep -q fail $R/rec.json && { echo "Spirit $DT FAIL $(cat $R/rec.json)"; exit 1; }
node -e 'require("fs").writeFileSync("'$R'/work.json",JSON.stringify([require("./'$R'/rec.json")]))'
echo "Spirit $DT before: $(node -e 'console.log(require("./'$R'/entry.json").lines.map(l=>l.account.slice(0,5)+" "+(l.debit||-l.credit)).join(" | "))') plan: $(node -e 'const r=require("./'$R'/rec.json");console.log(r.lines.map(l=>l.comment.slice(0,5)+" "+(l.col=="debit"?l.amount:-l.amount)).join(" | "),r.warnings.join("; "))')"
MDY=$(node -e 'const [y,m,d]=process.argv[1].split("-");console.log(+m+"/"+(+d)+"/"+y)' $DT)
ENTRY_DATE=$MDY bash $K/post-entry.sh $S Spirit $R/work.json 2>&1 | tail -n 2
bash $K/read-entry.sh $S $ID > $R/after.json
echo "Spirit $DT after: $(node -e 'const e=require("./'$R'/after.json");console.log(e.status,e.lines.map(l=>l.account.slice(0,5)+" "+(l.debit||-l.credit)).join(" | "))')"
