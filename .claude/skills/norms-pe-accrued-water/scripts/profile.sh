# Source after HERE is set: exports ACC EXP CORP NUM NOUN for env UTIL (water | electric), default water.
eval "$(UTIL="${UTIL:-water}" node -e 'const p=require(process.argv[1]);for(const k of ["acc","exp","corp","num","noun"])console.log(k.toUpperCase()+"=\x27"+p[k]+"\x27")' "$HERE/profile.js")"
[ -n "${ACC:-}" ] || { echo "FAIL profile ${UTIL:-water}"; exit 1; }
