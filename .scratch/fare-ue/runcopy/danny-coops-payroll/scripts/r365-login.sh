#!/bin/bash
# Log a playwright-cli session into R365. Idempotent: an already-authenticated
# session is left alone. Credentials come from ~/.claude/bowery-credentials.md,
# which lives outside any repo and is never copied into one.
#
# Usage: r365-login.sh <session>
# Exits nonzero if the session does not end up authenticated.
set -u
S="$1"
CREDS="$HOME/.claude/bowery-credentials.md"
[ -f "$CREDS" ] || { echo "FAIL: no $CREDS"; exit 1; }
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }

# match the HOST, not the href: the login page carries the app host inside its
# own ReturnUrl query parameter, so an href test calls a logged-out session good
host() { playwright-cli -s=$S eval "() => location.hostname" 2>&1 | res; }

[ "$(host)" = "dannyandcoops.restaurant365.com" ] && { echo "already authenticated"; exit 0; }

# first Username/Password pair under the R365 heading
USER=$(sed -n 's/^- *Username: *//p' "$CREDS" | head -1)
PASS=$(sed -n 's/^- *Password: *//p' "$CREDS" | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: could not parse credentials"; exit 1; }

# open the app root unless the login form is already up; a 404 or logout
# page also sits on the identity host
FORM=$(playwright-cli -s=$S eval "() => !!document.querySelector('#Username')" 2>&1 | res)
[ "$FORM" = "true" ] || { playwright-cli -s=$S open --headed https://dannyandcoops.restaurant365.com/react/accounting >/dev/null 2>&1; sleep 8; }

playwright-cli -s=$S fill '#Username' "$USER" >/dev/null 2>&1
playwright-cli -s=$S fill '#Password' "$PASS" >/dev/null 2>&1
playwright-cli -s=$S click 'button:has-text("Log in")' >/dev/null 2>&1
sleep 15

H=$(host)
[ "$H" = "dannyandcoops.restaurant365.com" ] || { echo "FAIL: still on $H"; exit 1; }
echo "authenticated"
