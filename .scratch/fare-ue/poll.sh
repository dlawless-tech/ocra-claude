# same-hash goto does not reload; leave the page first, then poll for the ribbon
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
for i in 1 2 3 4 5 6 7 8; do sleep 8
  R=$(playwright-cli -s=$S eval "() => (document.getElementById('Unapprove') ? 'yes' : document.getElementById('Approve') ? 'no' : 'wait')" 2>&1 | res)
  [ "$R" = yes ] && { echo "approved $ID"; exit 0; }
  [ "$R" = no ] && break
done
echo "FAIL: $ID not approved"; exit 1
