# Store table, sourced by the other scripts.
# store_conf <store> sets PORTAL_ACCT, PORTAL_NAME, LOC (R365 location filter text), PDF_PREFIX,
# BANK_ACCT (operating account on Bank Activity), LOC_NO (R365 location number)
store_conf() {
  case "$1" in
    rosies)   PORTAL_ACCT=acct_D1aw91sRVssOqwrmAaP5q; PORTAL_NAME="Rosies";   LOC="Rosie";    PDF_PREFIX="Rosie's";  BANK_ACCT=100-05; LOC_NO=500 ;;
    vics)     PORTAL_ACCT=acct_oBeOTAIsxkzbGugMMNAMW; PORTAL_NAME="Vic's";    LOC="Vic";      PDF_PREFIX="Vic's";    BANK_ACCT=100-08; LOC_NO=700 ;;
    cookshop) PORTAL_ACCT=acct_BMn23uCMlGk5xrWL1vBUD; PORTAL_NAME="Cookshop"; LOC="Cookshop"; PDF_PREFIX="Cookshop"; BANK_ACCT=100-10; LOC_NO=200 ;;
    *) echo "FAIL: unknown store $1 (rosies, vics, cookshop)"; exit 1 ;;
  esac
}
res() { sed -n '/### Result/{n;p;}'; }
# unwrap a JSON-string eval result to plain text
unjson() { grep '^"' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{if(s.trim())console.log(JSON.parse(s))})'; }
