# expand all tree rows with real clicks, then print
U=${UBER_SESSION:-fue-uber}
SH="$(dirname "$0")/../../bowery-ubereats/scripts/snapshot.sh"
for pass in 1 2 3; do bash $SH $U t.txt
  for R in $(grep -E 'treeitem "Right ' t.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2); do playwright-cli -s=$U click $R >/dev/null 2>&1; done; done
bash $SH $U t.txt
awk '/Pay breakdown/{on=1} /Daily payout/{on=0} on' t.txt | grep -oE 'treeitem "[^"]*"' | sed -E 's/treeitem "(Right|Down|Blank) //; s/"$//'
