#!/bin/bash
# Sign a playwright-cli session into Tripleseat Pay. Idempotent.
# Credentials: the "Tripleseat Pay" section of ~/.claude/bowery-credentials.md.
# Usage: tsp-login.sh <session>
set -u
S="$1"; T="playwright-cli -s=$S"
. "$(dirname "$0")/stores.sh"
CREDS="$HOME/.claude/bowery-credentials.md"
host() { $T eval "() => location.hostname" 2>&1 | res | tr -d '"'; }
[ "$(host)" = "partypay.paymentsonline.io" ] && { echo "already authenticated"; exit 0; }
SEC=$(sed -n '/^## Tripleseat Pay/,/^## /p' "$CREDS")
U=$(echo "$SEC" | sed -n 's/^- *Username: *//p' | head -1)
P=$(echo "$SEC" | sed -n 's/^- *Password: *//p' | head -1)
[ -n "$U" ] && [ -n "$P" ] || { echo "FAIL: no Tripleseat Pay credentials"; exit 1; }
$T open --headed https://partypay.paymentsonline.io/dashboard >/dev/null 2>&1; sleep 10
[ "$(host)" = "partypay.paymentsonline.io" ] && { echo "authenticated"; exit 0; }
SN=$($T snapshot 2>&1)
ref() { echo "$SN" | grep -F "$1" | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1; }
$T fill "$(ref 'textbox "Enter your email address"')" "$U" >/dev/null 2>&1
$T fill "$(ref 'textbox "Password"')" "$P" >/dev/null 2>&1
$T click "$(echo "$SN" | grep 'button "Sign In"' | grep cursor | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1)" >/dev/null 2>&1
sleep 12
[ "$(host)" = "partypay.paymentsonline.io" ] || { echo "FAIL: still on $(host)"; exit 1; }
echo "authenticated"
