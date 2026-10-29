#!/bin/bash
# Capture a page snapshot into a file, resolving the case where playwright-cli
# writes the YAML to .playwright-cli/ and prints only a link.
#
# Usage: snapshot.sh <session> <outfile>
#   session may be empty for the default (unnamed) session.
S="$1"; OUT="$2"
if [ -z "$S" ]; then playwright-cli snapshot > "$OUT" 2>&1; else playwright-cli -s=$S snapshot > "$OUT" 2>&1; fi
# octal 134 is a backslash: a literal one here is mangled by Windows argv rules,
# and sed 's|\|/|g' errors out under MSYS, silently leaving F empty.
F=$(grep -oE '[.]playwright-cli[\/][A-Za-z0-9._-]+[.]yml' "$OUT" | head -1 | tr '\134' '/')
if [ -n "$F" ] && [ -f "$F" ]; then cat "$F" > "$OUT"; fi
