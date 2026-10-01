#!/bin/bash
# log a playwright-cli session into Grubhub from ~/.claude/fare-credentials.md
set -u
S="$1"; C="$HOME/.claude/fare-credentials.md"
E=$(sed -n '/## Grubhub/,$s/^- *Email: *//p' "$C" | head -1); P=$(sed -n '/## Grubhub/,$s/^- *Password: *//p' "$C" | head -1)
[ -n "$E" ] && [ -n "$P" ] || { echo "FAIL: no Grubhub credentials"; exit 1; }
playwright-cli -s=$S open --headed https://restaurant.grubhub.com/login >/dev/null 2>&1; sleep 10
playwright-cli -s=$S fill 'input[type=email], input[name=username], input[type=text]' "$E" >/dev/null 2>&1
playwright-cli -s=$S fill 'input[type=password]' "$P" >/dev/null 2>&1
playwright-cli -s=$S click 'button:has-text("Sign in")' >/dev/null 2>&1; sleep 15
U=$(playwright-cli -s=$S eval "() => location.pathname" 2>&1 | sed -n '/### Result/{n;p}' | tr -d '"')
case "$U" in /login*) echo "FAIL: still on $U (mailed code?)"; exit 1;; esac
echo "authenticated $U"
