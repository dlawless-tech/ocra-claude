#!/bin/bash
# Log a playwright-cli session into the VandyPay (UGryd) admin. Idempotent.
# Credentials: the VandyPay block of ~/.claude/bowery-credentials.md, never copied into a repo.
# usage: vandypay-login.sh <session>
set -u
S="$1"
CREDS="$HOME/.claude/bowery-credentials.md"
[ -f "$CREDS" ] || { echo "FAIL: no $CREDS"; exit 1; }
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
here() { playwright-cli -s=$S eval "() => location.href" 2>&1 | res; }

case "$(here)" in https://admin.ugryd.com/store/*) echo "already authenticated"; exit 0;; esac
USER=$(sed -n '/^## VandyPay/,/^## /s/^- *Username: *//p' "$CREDS" | head -1)
PASS=$(sed -n '/^## VandyPay/,/^## /s/^- *Password: *//p' "$CREDS" | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: no VandyPay block in $CREDS"; exit 1; }

playwright-cli -s=$S open --headed https://admin.ugryd.com/ >/dev/null 2>&1; sleep 6
playwright-cli -s=$S fill 'input[name="username"], input[type="text"]' "$USER" >/dev/null 2>&1
playwright-cli -s=$S fill 'input[type="password"]' "$PASS" >/dev/null 2>&1
playwright-cli -s=$S eval "() => { document.login_form.submit(); return 1; }" >/dev/null 2>&1
sleep 8
case "$(here)" in https://admin.ugryd.com/store/*) echo "authenticated";; *) echo "FAIL: still on $(here)"; exit 1;; esac
