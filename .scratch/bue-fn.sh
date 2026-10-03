P=playwright-cli; SN=.claude/skills/bowery-ubereats/scripts/snapshot.sh
ref() { grep -F "$2" "$1" | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2; }
read_bd() { $P -s=bue eval "() => JSON.stringify({range:(document.body.innerText.match(/Selected date range is from [0-9/]+ to [0-9/]+/)||[''])[0], store:(Array.from(document.querySelectorAll('button')).map(b=>b.innerText.trim()).find(t=>/Cookshop|Rosie|Shuka|Vic/.test(t))), rows:Array.from(document.querySelectorAll('[role=treeitem]')).map(t=>t.getAttribute('aria-label')||t.innerText.replace(/\n/g,' '))})" 2>&1 | sed -n '/### Result/{n;p}'; }
# pick_date "September 2nd 2026"
pick_date() {
  $P -s=bue press Escape >/dev/null 2>&1
  sh $SN bue .scratch/bue-d.txt; R=$(grep -F 'textbox "Select a date range."' -B1 .scratch/bue-d.txt | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2)
  $P -s=bue click $R >/dev/null 2>&1; sleep 2
  sh $SN bue .scratch/bue-d.txt
  if ! grep -qF "$1" .scratch/bue-d.txt; then $P -s=bue click $(ref .scratch/bue-d.txt 'button "Previous month."') >/dev/null 2>&1; sleep 1; sh $SN bue .scratch/bue-d.txt; fi
  R=$(ref .scratch/bue-d.txt "$1"); $P -s=bue click $R >/dev/null 2>&1; sleep 4
}
pick_date() {
  sh $SN bue .scratch/bue-d.txt; R=$(grep -F 'textbox "Select a date range."' -B1 .scratch/bue-d.txt | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2)
  $P -s=bue click $R >/dev/null 2>&1; sleep 2
  sh $SN bue .scratch/bue-d.txt
  if ! grep -qF "$1" .scratch/bue-d.txt; then $P -s=bue click $(ref .scratch/bue-d.txt 'button "Previous month."') >/dev/null 2>&1; sleep 1; sh $SN bue .scratch/bue-d.txt; fi
  R=$(ref .scratch/bue-d.txt "$1"); $P -s=bue click $R >/dev/null 2>&1; sleep 4
}
pick_date() {
  for i in 1 2 3; do
    sh $SN bue .scratch/bue-d.txt
    grep -qE 'gridcell' .scratch/bue-d.txt && break
    R=$(grep -F 'textbox "Select a date range."' -B1 .scratch/bue-d.txt | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2)
    $P -s=bue click $R >/dev/null 2>&1; sleep 2
  done
  if ! grep -qF "$1" .scratch/bue-d.txt; then $P -s=bue click $(ref .scratch/bue-d.txt 'button "Previous month."') >/dev/null 2>&1; sleep 1; sh $SN bue .scratch/bue-d.txt; fi
  R=$(ref .scratch/bue-d.txt "$1"); $P -s=bue click $R >/dev/null 2>&1; sleep 4
}
pick_date() {
  $P -s=bue reload >/dev/null 2>&1; sleep 9
  for i in 1 2 3; do
    sh $SN bue .scratch/bue-d.txt
    grep -qE 'gridcell' .scratch/bue-d.txt && break
    R=$(grep -F 'textbox "Select a date range."' -B1 .scratch/bue-d.txt | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2)
    $P -s=bue click $R >/dev/null 2>&1; sleep 2
  done
  $P -s=bue click $(ref .scratch/bue-d.txt 'button "Previous month."') >/dev/null 2>&1; sleep 1; sh $SN bue .scratch/bue-d.txt
  R=$(ref .scratch/bue-d.txt "$1"); [ -z "$R" ] && { echo "NO CELL $1"; return; }
  $P -s=bue click $R >/dev/null 2>&1; sleep 4
}
pick_date() {
  $P -s=bue reload >/dev/null 2>&1; sleep 9
  for i in 1 2 3; do
    sh $SN bue .scratch/bue-d.txt
    grep -qE 'gridcell' .scratch/bue-d.txt && break
    R=$(grep -F 'textbox "Select a date range."' -B1 .scratch/bue-d.txt | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2)
    $P -s=bue click $R >/dev/null 2>&1; sleep 2
  done
  for i in 1 2 3; do
    grep -qF "$1" .scratch/bue-d.txt && break
    if grep -qE 'Month, (October|November)' .scratch/bue-d.txt; then B='button "Previous month."'; else B='button "Next month."'; fi
    $P -s=bue click $(ref .scratch/bue-d.txt "$B") >/dev/null 2>&1; sleep 1; sh $SN bue .scratch/bue-d.txt
  done
  R=$(ref .scratch/bue-d.txt "$1"); [ -z "$R" ] && { echo "NO CELL $1"; return; }
  $P -s=bue click $R >/dev/null 2>&1; sleep 4
}
pick_store() {
  $P -s=bue reload >/dev/null 2>&1; sleep 9; sh $SN bue .scratch/bue-d.txt
  B=$(grep -E 'button "(Cookshop|Rosie|Shuka|Vic)' .scratch/bue-d.txt | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2)
  $P -s=bue click $B >/dev/null 2>&1; sleep 3; sh $SN bue .scratch/bue-d.txt
  R=$(grep -F "generic [ref=" .scratch/bue-d.txt | grep -F ": $1" | grep -oE 'ref=f[0-9]+e[0-9]+' | head -1 | cut -d= -f2)
  $P -s=bue click $R >/dev/null 2>&1; sleep 1
  $P -s=bue click $(ref .scratch/bue-d.txt 'button "Apply"') >/dev/null 2>&1; sleep 5
}
