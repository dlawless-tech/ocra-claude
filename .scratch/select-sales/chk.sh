echo "set: $(playwright-cli -s=$S eval "$(sed "s/__W__/$W/" "$SK/set-lines.tpl.js")" 2>&1 | res)"
bash "$SAVE" $S | grep -q "\"$ID\"" || fail "save did not commit"

playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S eval "$(cat "$READ")" 2>&1 | res > readback.json
node -e '
const fs=require("fs"), j=JSON.parse(JSON.parse(fs.readFileSync("readback.json","utf8"))), e=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[process.argv[2]];
const c=x=>Math.round(x*100); let ok=j.date===e.date && j.number===e.number && j.lines.length===e.lines.length;
for(const [a,dr,cr] of e.lines){ const l=j.lines.find(x=>String(x.a).startsWith(a+" ")); const hit=l && c(l.dr)===c(dr) && c(l.cr)===c(cr) && /^370 /.test(l.loc); ok=ok&&!!hit;
  console.log((hit?"  ":"! ")+a+" dr "+(l?l.dr:"-")+" cr "+(l?l.cr:"-")+" want "+dr+"/"+cr); }
console.log(j.date+" "+j.number+" "+(ok?"MATCH":"MISMATCH")); process.exit(ok?0:1);' "$LJ" "$K"
