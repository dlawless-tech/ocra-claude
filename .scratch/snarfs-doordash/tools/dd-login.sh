#!/bin/bash
# Log a playwright-cli session into the DoorDash merchant portal on the saved Snarfs profile, from ~/.claude/snarfs-credentials.md.
# The profile keeps the device trusted, so a code is asked only on its first login. One browser per profile at a time.
# usage: dd-login.sh <session>
# Exits nonzero unless the session lands on merchant-portal.doordash.com. A mailed code is for the human.
set -u
S="$1"; CREDS="$HOME/.claude/snarfs-credentials.md"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
host() { playwright-cli -s=$S eval "() => location.hostname" 2>&1 | res; }
[ "$(host)" = "merchant-portal.doordash.com" ] && { echo "already authenticated"; exit 0; }
BLOCK=$(sed -n '/^## DoorDash/,/^## /p' "$CREDS")
USER=$(echo "$BLOCK" | sed -n 's/^- *Email: *//p' | head -1); PASS=$(echo "$BLOCK" | sed -n 's/^- *Password: *//p' | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: no DoorDash block in $CREDS"; exit 1; }
playwright-cli -s=$S open --headed --profile "$HOME/.claude/playwright-profiles/snarfs-doordash" https://www.doordash.com/merchant/login >/dev/null 2>&1; sleep 10
# a signed-in profile can land on the consumer site; go to the portal directly
portal() { playwright-cli -s=$S goto https://merchant-portal.doordash.com/merchant/financials >/dev/null 2>&1; sleep 12; }
[ "$(host)" = "www.doordash.com" ] && portal
[ "$(host)" = "merchant-portal.doordash.com" ] && { echo "authenticated"; exit 0; }
playwright-cli -s=$S fill 'input[type=email]' "$USER" >/dev/null 2>&1
playwright-cli -s=$S click 'button:has-text("Continue to Log In")' >/dev/null 2>&1; sleep 6
playwright-cli -s=$S fill 'input[type=password]' "$PASS" >/dev/null 2>&1
playwright-cli -s=$S click 'button:has-text("Log In") >> nth=0' >/dev/null 2>&1; sleep 10
[ "$(host)" = "www.doordash.com" ] && portal
H=$(host); [ "$H" = "merchant-portal.doordash.com" ] || { echo "FAIL: still on $H (a mailed code needs the human)"; exit 1; }
echo "authenticated"
