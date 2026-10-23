#!/bin/bash
# Open a headed Toast session on Snarf's saved profile. Never types the Toast password: the human signs in.
# With a wait, posts a card to the TPD channel tagging the code contact (codeMention) and polls until the window is signed in.
# The login spans many clients, so once signed in it switches the restaurant picker to Snarf's MX.
# Exits 0 signed in on Snarf's, 2 still signed out, 1 anything else.
# usage: toast-login.sh <session> [wait seconds, default 0]
set -u
S="$1"; WAIT="${2:-0}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
path() { playwright-cli -s=$S eval "() => location.host + location.pathname" 2>&1 | res; }
signed() { case "$(path)" in www.toasttab.com/restaurants/admin*) return 0;; esac; return 1; }
ref() { playwright-cli -s=$S snapshot 2>&1 | grep -m1 -F "$1" | sed -n 's/.*\[ref=\([^]]*\)\].*/\1/p'; }
onsnarfs() { [ -n "$(ref 'combobox "Toggle restaurant picker"')" ] && playwright-cli -s=$S snapshot 2>&1 | grep -A6 -F 'Toggle restaurant picker' | grep -q "Snarf"; }
snarfs() {
  playwright-cli -s=$S goto https://www.toasttab.com/restaurants/admin/home >/dev/null 2>&1; sleep 10
  onsnarfs && return 0
  R=$(ref 'combobox "Toggle restaurant picker"'); [ -n "$R" ] || { echo "FAIL: no restaurant picker"; exit 1; }
  playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 3
  R=$(ref 'searchbox'); [ -n "$R" ] || { echo "FAIL: no picker search box"; exit 1; }
  playwright-cli -s=$S fill $R "Snarf's Sandwiches - MX" >/dev/null 2>&1; sleep 4
  R=$(ref "Snarf's Sandwiches - MX - search option"); [ -n "$R" ] || { echo "FAIL: Snarf's MX not in the restaurant picker"; exit 1; }
  playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 15
  onsnarfs || { echo "FAIL: restaurant picker did not switch to Snarf's"; exit 1; }
}

signed && { snarfs; echo "already authenticated"; exit 0; }
playwright-cli -s=$S open --headed --profile "$HOME/.claude/playwright-profiles/snarfs-toast" https://www.toasttab.com/restaurants/admin/home >/dev/null 2>&1; sleep 15
signed && { snarfs; echo "authenticated"; exit 0; }
[ -n "$(path)" ] || { echo "FAIL: Toast window did not open"; exit 1; }
[ "$WAIT" -gt 0 ] || { echo "SIGNIN: Toast is signed out ($(path))"; exit 2; }

powershell -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$HERE/notify-teams.ps1")" \
  -Title "Snarf's advance orders recon running: Toast code needed" -Code \
  -Ask "a Toast code is needed: sign in to the open Toast window and enter the code." \
  -Lines "The run is waiting up to $((WAIT / 60)) minutes." >/dev/null 2>&1
END=$((SECONDS + WAIT))
while [ $SECONDS -lt $END ]; do
  sleep 15
  signed && { snarfs; echo "authenticated"; exit 0; }
done
echo "SIGNIN: no Toast sign-in within $((WAIT / 60)) minutes"; exit 2
