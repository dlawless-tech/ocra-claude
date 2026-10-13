#!/bin/bash
# Log a headed Stripe session in on the saved NORMS profile, from ~/.claude/norms-credentials.md.
# Stripe texts a code to the phone ending 3281; that is for the human. With a wait, posts the code card
# to Teams tagging codeMention and polls until the human types the code in the window.
# Exits 0 signed in, 2 still on the code page, 1 anything else.
# usage: stripe-login.sh <session> [wait seconds, default 0]
set -u
S="$1"; WAIT="${2:-0}"; CREDS="$HOME/.claude/norms-credentials.md"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACCT_URL='https://dashboard.stripe.com/acct_1IVMd4Icg0NAKHmc/payouts?status=paid'
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
url() { playwright-cli -s=$S eval "() => location.host + location.pathname" 2>&1 | res; }
text() { playwright-cli -s=$S eval "() => document.body.innerText.slice(0,400)" 2>&1 | res; }
ref() { playwright-cli -s=$S snapshot 2>&1 | grep -oE "$1 \[(active\] \[)?ref=[a-z0-9]+\]" | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2; }
signed() { case "$(url)" in dashboard.stripe.com/acct_*|dashboard.stripe.com/payouts*) return 0;; esac; return 1; }

signed && { echo "already authenticated"; exit 0; }
playwright-cli -s=$S open --headed --profile "$HOME/.claude/playwright-profiles/norms-stripe" "$ACCT_URL" >/dev/null 2>&1; sleep 10
signed && { echo "authenticated"; exit 0; }

if text | grep -q 'Sign in to your account'; then
  BLOCK=$(sed -n '/^## Stripe/,/^## /p' "$CREDS")
  USER=$(echo "$BLOCK" | sed -n 's/^- *Email: *//p' | head -1); PASS=$(echo "$BLOCK" | sed -n 's/^- *Password: *//p' | head -1)
  [ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: no Stripe block in $CREDS"; exit 1; }
  playwright-cli -s=$S fill "$(ref 'textbox "email input"')" "$USER" >/dev/null 2>&1
  playwright-cli -s=$S fill "$(ref 'textbox "password input"')" "$PASS" >/dev/null 2>&1
  playwright-cli -s=$S click "$(ref 'button "Sign in"')" >/dev/null 2>&1; sleep 10
  signed && { echo "authenticated"; exit 0; }
fi
text | grep -q 'verification code' || { echo "FAIL: landed on $(url)"; exit 1; }
[ "$WAIT" -gt 0 ] || { echo "CODE: Stripe texted a code to the phone ending 3281"; exit 2; }

powershell -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$HERE/notify-teams.ps1")" -Code \
  -Title "NORMS Stripe deposits running: sign-in code needed" \
  -Lines "The run is waiting up to $((WAIT / 60)) minutes for the code." >/dev/null 2>&1
END=$((SECONDS + WAIT))
while [ $SECONDS -lt $END ]; do
  sleep 15
  signed && { echo "authenticated"; exit 0; }
done
echo "CODE: no code typed within $((WAIT / 60)) minutes"; exit 2
