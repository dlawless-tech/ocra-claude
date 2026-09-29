# Print the Daily Sales Summary id behind a DSS journal entry.
# usage: dss-of.sh <session> <journal entry id>
SK=$(cd "$(dirname "$0")" && pwd)
S=$1; playwright-cli -s=$S goto "https://unoatfifth.restaurant365.com/#/form/JournalEntryForm/$2" >/dev/null 2>&1
for i in 1 2 3 4 5 6; do sleep 4; H=$(playwright-cli -s=$S eval "() => (Array.from(document.querySelectorAll('a[href*=dailysalessummaryform]'))[0]||{}).href||''" | sed -n '/### Result/{n;p;}' | tr -d '"'); [ -n "$H" ] && break; done
echo "${H##*/}"
