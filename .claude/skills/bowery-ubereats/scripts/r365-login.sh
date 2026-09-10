#!/bin/bash
# Log a playwright-cli session into R365. Idempotent: an already-authenticated
# session is left alone. Credentials come from ~/.claude/bowery-credentials.md,
# which lives outside any repo and is never copied into one.
#
# Usage: r365-login.sh <session>
set -u
S="$1"
CREDS="$HOME/.claude/bowery-credentials.md"
[ -f "$CREDS" ] || { echo "FAIL: no $CREDS"; exit 1; }

U=$(playwright-cli -s=$S eval "() => location.href" 2>&1 | sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"')
case "$U" in *bowerygroup.restaurant365.com*) echo "already authenticated: $U"; exit 0;; esac

# first Username/Password pair under the R365 heading
USER=$(sed -n 's/^- *Username: *//p' "$CREDS" | head -1)
PASS=$(sed -n 's/^- *Password: *//p' "$CREDS" | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: could not parse credentials"; exit 1; }

playwright-cli -s=$S open --headed https://bowerygroup.restaurant365.com/react/accounting >/dev/null 2>&1
sleep 8
playwright-cli -s=$S fill '#Username' "$USER" >/dev/null 2>&1
playwright-cli -s=$S fill '#Password' "$PASS" >/dev/null 2>&1
playwright-cli -s=$S click 'button:has-text("Log in")' >/dev/null 2>&1
sleep 15
playwright-cli -s=$S eval "() => location.href" 2>&1 | sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'
echo
