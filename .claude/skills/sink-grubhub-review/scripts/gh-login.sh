#!/bin/bash
# Log a playwright-cli session into Grubhub for Restaurants from ~/.claude/sink-credentials.md (todd+1).
# usage: gh-login.sh <session>
set -u
S="$1"; CREDS="$HOME/.claude/sink-credentials.md"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
path() { playwright-cli -s=$S eval "() => location.hostname + location.pathname" 2>&1 | res; }
ref() { playwright-cli -s=$S snapshot 2>&1 | grep -E "$1" | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2; }
BLOCK=$(sed -n '/^## Grubhub/,/^## /p' "$CREDS")
USER=$(echo "$BLOCK" | sed -n 's/^- *Username: *//p' | head -1); PASS=$(echo "$BLOCK" | sed -n 's/^- *Password: *//p' | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: no Grubhub block in $CREDS"; exit 1; }
playwright-cli list 2>&1 | grep -q "$S" || playwright-cli -s=$S open --headed https://restaurant.grubhub.com/login >/dev/null 2>&1
sleep 8; path | grep -q '/dashboard' && { echo "authenticated"; exit 0; }
U=$(ref 'textbox "Username or email address"'); P=$(ref 'textbox "Password"'); B=$(ref 'button "Sign in"')
[ -n "$U" ] && [ -n "$P" ] && [ -n "$B" ] || { echo "FAIL: no login form on $(path)"; exit 1; }
playwright-cli -s=$S fill $U "$USER" >/dev/null 2>&1; playwright-cli -s=$S fill $P "$PASS" >/dev/null 2>&1
playwright-cli -s=$S click $B >/dev/null 2>&1; sleep 12
path | grep -q '/dashboard' && echo "authenticated" || { echo "FAIL: on $(path) (a mailed code needs the human)"; exit 1; }
