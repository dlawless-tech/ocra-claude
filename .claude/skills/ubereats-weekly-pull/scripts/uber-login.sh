#!/bin/bash
# Log session uwp-<client> into Uber Eats Manager on the client's saved profile.
# Login comes only from the client's Teams login sheet (clients.json loginSheet under ~/OCRA), so a changed login is picked up.
# Uber mails a 4-digit code; the human types it into the open window. Waits WAIT minutes (default 60).
# Exits 0 logged in, 2 no code in time, 1 anything else.
# usage: [WAIT=60] uber-login.sh <client>     (client: a key in clients.json)
set -u
C="$1"; S="uwp-$C"; WAIT="${WAIT:-60}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
host() { playwright-cli -s=$S eval "() => location.host + location.pathname" 2>&1 | res; }
authed() { case "$(host)" in merchants.ubereats.com/manager*) return 0;; esac; return 1; }
authed && { echo "$C already authenticated"; exit 0; }

cfg() { node -e 'const c=require(process.argv[1])[process.argv[2]];if(!c)process.exit(1);console.log(c[process.argv[3]])' "$(cygpath -m "$HERE/clients.json")" "$C" "$1"; }
SHEET="$HOME/OCRA/$(cfg loginSheet)" || { echo "FAIL: no client $C in clients.json"; exit 1; }
J=$(powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$HERE/sheet-login.ps1")" -Workbook "$(cygpath -w "$SHEET")" 2>/dev/null | tr -d '\r')
EMAIL=$(node -e 'try{console.log(JSON.parse(process.argv[1]).email||"")}catch(e){}' "$J")
PASS=$(node -e 'try{console.log(JSON.parse(process.argv[1]).password||"")}catch(e){}' "$J")
[ -n "$EMAIL" ] || { echo "FAIL: no Uber Eats login read from $SHEET"; exit 1; }

[ -n "$(host | grep -v Error)" ] || playwright-cli -s=$S open --headed --profile "$HOME/.claude/playwright-profiles/$C-ubereats" https://merchants.ubereats.com/manager/ >/dev/null 2>&1; sleep 10
authed && { echo "$C authenticated"; exit 0; }
playwright-cli -s=$S fill 'input[type="email"], input[name="PHONE_NUMBER_or_EMAIL_ADDRESS"], input[placeholder*="email" i]' "$EMAIL" >/dev/null 2>&1
playwright-cli -s=$S click 'role=button[name="Continue"s]' >/dev/null 2>&1; sleep 8
# some logins ask for the password before the code
PW=$(playwright-cli -s=$S eval "() => document.querySelectorAll('input[type=password]').length" 2>&1 | res)
if [ "${PW:-0}" -gt 0 ]; then
  [ -n "$PASS" ] || { echo "FAIL: Uber asks a password for $EMAIL and the sheet has none"; exit 1; }
  playwright-cli -s=$S fill 'input[type=password]' "$PASS" >/dev/null 2>&1
  playwright-cli -s=$S click 'role=button[name="Continue"s]' >/dev/null 2>&1; sleep 8
  authed && { echo "$C authenticated"; exit 0; }
fi
OTP=$(playwright-cli -s=$S eval "() => document.querySelectorAll('input[aria-label*=\"OTP\" i]').length" 2>&1 | res)
[ "${OTP:-0}" -gt 0 ] || { echo "FAIL: $C no code screen, landed on $(host)"; exit 1; }
playwright-cli -s=$S click 'input[aria-label*="OTP" i] >> nth=0' >/dev/null 2>&1
echo "$C: waiting up to $WAIT min for the code mailed to $EMAIL, in the $S window"
for ((i = 0; i < WAIT * 4; i++)); do sleep 15; authed && { echo "$C authenticated"; exit 0; }; done
echo "FAIL: $C no code entered within $WAIT minutes"; exit 2
