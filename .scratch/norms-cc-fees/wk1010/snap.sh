# snap <session> <outfile>
snap() {
  playwright-cli -s=$1 snapshot > "$2" 2>&1
  F=$(grep -oE '[.]playwright-cli[\/][A-Za-z0-9._-]+[.]yml' "$2" | head -1 | sed 's|\\|/|g')
  [ -n "$F" ] && [ -f "$F" ] && cat "$F" > "$2"
}
