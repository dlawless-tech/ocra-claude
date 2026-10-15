#!/bin/bash
# usage (from repo root): fix-one.sh <session> <store> <YYYY-MM-DD>
set -u
S=$1; ST=$2; DT=$3; W=.scratch/snarfs-grubhub/review; K=.claude/skills/snarfs-grubhub/scripts
R=$W/fix/$ST-$DT; mkdir -p $R
read A B D ID MDY < <(node -e '
const [st,dt]=process.argv.slice(1);const x=require("./'$W'/fix.json").find(x=>x.store===st&&x.date===dt);
const g=JSON.parse(JSON.parse(require("fs").readFileSync("'$W'/../../snarfs-grubhub/review/../../snarfs-grubhub/grub-grid.json","utf8"))).find(y=>y.d===dt&&y.loc.endsWith(" - "+st));
const [a,b]=x.window.split("..");const [y,m,d]=dt.split("-");console.log(a,b,x.D,g.id,(+m)+"/"+(+d)+"/"+y)' "$ST" "$DT")
node $K/figures.js $W/../year.json $A $B > $R/figures.json
bash $K/read-entry.sh $S $ID > $R/entry.json || { echo "$ST $DT FAIL read"; exit 1; }
node $K/plan.js $R/figures.json $ST $D $R/entry.json > $R/rec.json
grep -q fail $R/rec.json && { echo "$ST $DT FAIL plan $(cat $R/rec.json)"; exit 1; }
node -e 'const r=require("./'$R'/rec.json");r.loc=process.argv[1];require("fs").writeFileSync("'$R'/work.json",JSON.stringify([r]))' "$ST"
echo "$ST $DT before: $(node -e 'console.log(require("./'$R'/entry.json").lines.map(l=>l.comment+" "+(l.debit||-l.credit)).join(" | "))')"
echo "$ST $DT plan:   $(node -e 'const r=require("./'$R'/rec.json");console.log(r.lines.map(l=>l.comment+" "+(l.col=="debit"?l.amount:-l.amount)).join(" | "), r.warnings.join("; "))')"
[ -n "${DRY:-}" ] && exit 0
ENTRY_DATE=$MDY bash $K/post-entry.sh $S "$ST" $R/work.json 2>&1 | tail -3
bash $K/read-entry.sh $S $ID > $R/after.json
echo "$ST $DT after: $(node -e 'const e=require("./'$R'/after.json");console.log(e.status, e.lines.map(l=>l.comment+" "+(l.debit||-l.credit)).join(" | "))')"
