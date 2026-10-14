#!/bin/bash
# Attach a file to the open entry through its Upload File button.
# usage: attach.sh <session> <file>
# The page carries two #attachmentsModuleInputButton; the Theme Builder's
# logo uploader is the first, the entry's sits in .journal-entry-form.
set -u
S="$1"; F="$2"
playwright-cli -s=$S click '.journal-entry-form #attachmentsModuleInputButton' >/dev/null 2>&1
playwright-cli -s=$S upload "$F" >/dev/null 2>&1
sleep 10
N=$(basename "$F")
playwright-cli -s=$S eval "() => Array.from(document.querySelectorAll('.journal-entry-form a')).some(a => a.innerText.trim() === '$N')" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed -n 2p | grep -q true && echo "attached $N" || { echo "FAIL: $N not listed on the entry"; exit 1; }
