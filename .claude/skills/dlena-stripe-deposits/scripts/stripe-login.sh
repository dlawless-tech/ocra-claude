#!/bin/bash
# Open a headed Stripe session on dLena's saved profile, so a sign-in survives between runs.
# No password is saved; sign-in and its texted code are for the human. Exits 2 when Stripe wants a sign-in.
# usage: stripe-login.sh <session>
set -u
S="$1"
ACCT_URL='https://dashboard.stripe.com/acct_1JKplFAju1EvNWw5'
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
path() { playwright-cli -s=$S eval "() => location.host + location.pathname" 2>&1 | res; }
case "$(path)" in dashboard.stripe.com/acct_1JKplFAju1EvNWw5*) echo "already authenticated"; exit 0;; esac
playwright-cli -s=$S open --headed --profile "$HOME/.claude/playwright-profiles/dlena-stripe" "$ACCT_URL/payouts" >/dev/null 2>&1; sleep 10
P=$(path)
case "$P" in
  dashboard.stripe.com/acct_1JKplFAju1EvNWw5*) echo "authenticated";;
  *login*|*verify*|*2fa*) echo "FAIL: Stripe wants a sign-in in the $S window"; exit 2;;
  *) echo "FAIL: landed on $P"; exit 1;;
esac
