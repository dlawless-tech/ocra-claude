#!/bin/bash
# Log a playwright-cli session into Uber Eats Manager on a saved profile, from ~/.claude/norms-credentials.md.
# Uber mails a 4-digit code; the human types it into the open window. With NOTIFY=1 a Teams card tags the code contact.
# Waits WAIT minutes (default 60) for the code. Exits 0 logged in, 2 no code in time, 1 anything else.
# usage: [NOTIFY=1] [WAIT=60] [PERIOD="10/5 - 10/11/2026"] uber-login.sh <session>
set -u
S="$1"; CREDS="$HOME/.claude/norms-credentials.md"; WAIT="${WAIT:-60}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
host() { playwright-cli -s=$S eval "() => location.host + location.pathname" 2>&1 | res; }
authed() { case "$(host)" in merchants.ubereats.com/manager*) return 0;; esac; return 1; }
authed && { echo "already authenticated"; exit 0; }
EMAIL=$(sed -n '/^## Uber Eats/,/^## /p' "$CREDS" | sed -n 's/^- *Email: *//p' | head -1)
[ -n "$EMAIL" ] || { echo "FAIL: no Uber Eats block in $CREDS"; exit 1; }
[ -n "$(host | grep -v Error)" ] || playwright-cli -s=$S open --headed --profile "$HOME/.claude/playwright-profiles/norms-ubereats" https://merchants.ubereats.com/manager/ >/dev/null 2>&1; sleep 10
authed && { echo "authenticated"; exit 0; }
playwright-cli -s=$S fill 'input[type="email"], input[name="PHONE_NUMBER_or_EMAIL_ADDRESS"], input[placeholder*="email" i]' "$EMAIL" >/dev/null 2>&1
playwright-cli -s=$S click 'role=button[name="Continue"s]' >/dev/null 2>&1; sleep 8
OTP=$(playwright-cli -s=$S eval "() => document.querySelectorAll('input[aria-label*=\"OTP\" i]').length" 2>&1 | res)
[ "${OTP:-0}" -gt 0 ] || { echo "FAIL: no code screen, landed on $(host)"; exit 1; }
playwright-cli -s=$S click 'input[aria-label*="OTP" i] >> nth=0' >/dev/null 2>&1
if [ "${NOTIFY:-0}" = 1 ]; then
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$HERE/notify-teams.ps1")" -Title 'NORMS Uber Eats: login code needed' -Mention code \
    -Lines "Uber Eats mailed a 4-digit code to $EMAIL for the NORMS Uber Eats run${PERIOD:+ (pay period $PERIOD)}. The run waits $WAIT minutes." || echo "WARN: Teams code card failed"
fi
echo "waiting up to $WAIT min for the code in the $S window"
for ((i = 0; i < WAIT * 4; i++)); do sleep 15; authed && { echo "authenticated"; exit 0; }; done
echo "FAIL: no code entered within $WAIT minutes"; exit 2
