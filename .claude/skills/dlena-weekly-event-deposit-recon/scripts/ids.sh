# NJ number -> JE entityId from a report snapshot
SK=$(cd "$(dirname "$0")" && pwd)
grep -A1 -E 'link "(NJ|BD)[0-9]+"' "$1" | paste - - - 2>/dev/null | sed -nE 's/.*link "([A-Z]+[0-9]+)".*entityId=([0-9a-f-]+).*/\1 \2/p' | sort -u
