#!/bin/bash
# Log a playwright-cli session into the EZ Cater Partner Portal from ~/.claude/norms-credentials.md.
# The portal mails a code to new devices; that is for the human. Exits 2 when it asks for one.
# The session runs on a saved profile so the remembered device (30 days) survives between runs.
# usage: ez-login.sh <session>
set -u
S="$1"; CREDS="$HOME/.claude/norms-credentials.md"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
host() { playwright-cli -s=$S eval "() => location.host + location.pathname" 2>&1 | res; }
ref() { grep -oE "$1 \[(active\] \[)?ref=[a-z0-9]+\]" snap.tmp | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2; }
case "$(host)" in partnerportal.ezcater.com/*|www.ezcater.com/ez_manage*) echo "already authenticated"; exit 0;; esac
BLOCK=$(sed -n '/^## EZ Cater/,/^## /p' "$CREDS")
USER=$(echo "$BLOCK" | sed -n 's/^- *Email: *//p' | head -1); PASS=$(echo "$BLOCK" | sed -n 's/^- *Password: *//p' | head -1)
[ -n "$USER" ] && [ -n "$PASS" ] || { echo "FAIL: no EZ Cater block in $CREDS"; exit 1; }
playwright-cli -s=$S open --headed --profile "$HOME/.claude/playwright-profiles/norms-ezcater" https://www.ezcater.com/caterer_portal/sign_in >/dev/null 2>&1; sleep 8
case "$(host)" in partnerportal.ezcater.com/*) echo "authenticated"; exit 0;; esac
bash "$HERE/snapshot.sh" $S snap.tmp
playwright-cli -s=$S fill "$(ref 'textbox "Email"')" "$USER" >/dev/null 2>&1
playwright-cli -s=$S click "$(ref 'button "Continue"')" >/dev/null 2>&1; sleep 6
bash "$HERE/snapshot.sh" $S snap.tmp
playwright-cli -s=$S fill "$(ref 'textbox "Password"')" "$PASS" >/dev/null 2>&1
playwright-cli -s=$S click "$(ref 'button "Sign in"')" >/dev/null 2>&1; sleep 12
H=$(host); rm -f snap.tmp
case "$H" in partnerportal.ezcater.com/*) echo "authenticated";; *mfa*) playwright-cli -s=$S click "text=Remember this device for 30 days" >/dev/null 2>&1; echo "FAIL: EZ Cater mailed a code to mark@ocra-us.com"; exit 2;; *) echo "FAIL: landed on $H"; exit 1;; esac
