#!/bin/bash
S="$1"; OUT="$2"
playwright-cli -s=$S snapshot > "$OUT" 2>&1
F=$(grep -oE '[.]playwright-cli[\/][A-Za-z0-9._-]+[.]yml' "$OUT" | head -1 | sed 's|\\|/|g')
if [ -n "$F" ] && [ -f "$F" ]; then cat "$F" > "$OUT"; fi
