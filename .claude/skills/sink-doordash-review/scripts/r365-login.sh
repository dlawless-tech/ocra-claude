#!/bin/bash
# Log a playwright-cli session into the Sink R365 (journeygroup) from ~/.claude/sink-credentials.md. Safe to re-run.
# usage: r365-login.sh <session>
set -u
S="$1"; HOST=journeygroup.restaurant365.com; CREDS="$HOME/.claude/sink-credentials.md"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
# the login form sits in an iframe, on journeygroup #/user/login or on identity.restaurant365.com
authed() { [ "$(playwright-cli -s=$S eval "() => location.hostname + (/user.login/.test(location.hash) ? '-login' : '')" 2>&1 | res)" = "$HOST" ]; }
ref() { playwright-cli -s=$S snapshot 2>&1 | grep -E "$1" | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2; }
BLOCK=$(sed -n '/^## R365/,/^## /p' "$CREDS")
USER=$(echo "$BLOCK" | sed -n 's/^- *Username: *//p' | head -1); PASS=$(echo "$BLOCK" | sed -n 's/^- *Password: *//p' | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: no R365 block in $CREDS"; exit 1; }
playwright-cli list 2>&1 | grep -q "$S" || playwright-cli -s=$S open --headed "https://$HOST/" >/dev/null 2>&1
playwright-cli -s=$S goto "https://$HOST/" >/dev/null 2>&1; sleep 12
authed && { echo "authenticated"; exit 0; }
U=$(ref 'textbox "Enter username"'); P=$(ref 'textbox "Enter password"'); B=$(ref 'button "Log in"')
[ -n "$U" ] && [ -n "$P" ] && [ -n "$B" ] || { echo "FAIL: no login form"; exit 1; }
playwright-cli -s=$S fill $U "$USER" >/dev/null 2>&1; playwright-cli -s=$S fill $P "$PASS" >/dev/null 2>&1
playwright-cli -s=$S click $B >/dev/null 2>&1
for i in 1 2 3 4; do sleep 8; authed && break; done
authed && echo "authenticated" || { echo "FAIL: login did not land"; exit 1; }
