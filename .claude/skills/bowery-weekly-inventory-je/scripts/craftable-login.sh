#!/bin/bash
# Open (or reuse) a Craftable tab in the session and sign in. Leaves that tab current
# and prints its index. Credentials: the Craftable block of ~/.claude/bowery-credentials.md.
#
# Usage: craftable-login.sh <session>
set -u
S="$1"
CREDS="$HOME/.claude/bowery-credentials.md"
res() { sed -n '/### Result/{n;p;}' | tr -d '"'; }
url() { playwright-cli -s=$S eval "() => location.href" 2>&1 | res; }

T=$(playwright-cli -s=$S tab-list 2>&1 | grep -E '^- [0-9]+: .*app\.craftable\.com' | head -1 | grep -oE '^- [0-9]+' | grep -oE '[0-9]+')
if [ -n "$T" ]; then playwright-cli -s=$S tab-select $T >/dev/null 2>&1
else playwright-cli -s=$S tab-new https://app.craftable.com/signin >/dev/null 2>&1; sleep 8
  T=$(playwright-cli -s=$S tab-list 2>&1 | grep -E '^- [0-9]+: .*app\.craftable\.com' | head -1 | grep -oE '^- [0-9]+' | grep -oE '[0-9]+'); fi
[ -n "$T" ] || { echo "FAIL: no Craftable tab"; exit 1; }

case "$(url)" in *signin*)
  U=$(sed -n '/## Craftable/,$p' "$CREDS" | sed -n 's/^- *Email: *//p' | head -1)
  P=$(sed -n '/## Craftable/,$p' "$CREDS" | sed -n 's/^- *Password: *//p' | head -1)
  [ -n "$U" ] && [ -n "$P" ] || { echo "FAIL: no Craftable block in $CREDS"; exit 1; }
  playwright-cli -s=$S fill 'input[type=email], input[name=email]' "$U" >/dev/null 2>&1
  playwright-cli -s=$S fill 'input[type=password]' "$P" >/dev/null 2>&1
  playwright-cli -s=$S click 'button:has-text("login")' >/dev/null 2>&1; sleep 12;;
esac
case "$(url)" in *signin*) echo "FAIL: still on sign-in"; exit 1;; esac
echo "$T"
