#!/bin/bash
# Log a playwright-cli session into the Foodja Restaurant Partner Portal from ~/.claude/norms-credentials.md.
# usage: fj-login.sh <session>
set -u
S="$1"; CREDS="$HOME/.claude/norms-credentials.md"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
path() { playwright-cli -s=$S eval "() => location.pathname" 2>&1 | res; }
case "$(path)" in /restaurant-portal/*) echo "already authenticated"; exit 0;; esac
BLOCK=$(sed -n '/^## Foodja/,/^## /p' "$CREDS")
USER=$(echo "$BLOCK" | sed -n 's/^- *Email: *//p' | head -1); PASS=$(echo "$BLOCK" | sed -n 's/^- *Password: *//p' | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: no Foodja block in $CREDS"; exit 1; }
playwright-cli -s=$S open --headed https://foodja.com/restaurant-portal/ >/dev/null 2>&1; sleep 8
case "$(path)" in /restaurant-portal/*) echo "authenticated"; exit 0;; esac
# two steps: email, NEXT, then password, LOG IN
playwright-cli -s=$S fill 'input[placeholder="Enter email/username"]' "$USER" >/dev/null 2>&1
playwright-cli -s=$S click 'button:text-is("NEXT")' >/dev/null 2>&1; sleep 4
playwright-cli -s=$S fill 'input[type=password]' "$PASS" >/dev/null 2>&1
playwright-cli -s=$S click 'button:text-is("LOG IN")' >/dev/null 2>&1; sleep 6
playwright-cli -s=$S goto https://foodja.com/restaurant-portal/ >/dev/null 2>&1; sleep 4
P=$(path); case "$P" in /restaurant-portal/*) echo "authenticated";; *) echo "FAIL: landed on $P"; exit 1;; esac
