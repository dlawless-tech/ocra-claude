#!/bin/bash
# Read one saved entry back as JSON {id,date,num,hdr,approved,rows:[[comment,debit,credit,account,location]]}.
# usage: read-entry.sh <session> <TransactionId> <out.json>
S=$1; ID=$2; HERE="$(cd "$(dirname "$0")" && pwd)"
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "https://frankiesspuntino.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 16
playwright-cli -s=$S eval "$(cat "$HERE/read-model.js")" 2>&1 | sed -n '/### Result/{n;p;}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v=JSON.parse(s);if(typeof v==="string")v=JSON.parse(v);require("fs").writeFileSync(process.argv[1],JSON.stringify(v));console.log(v.num,v.date,v.approved?"Approved":"Unapproved")})' "$3"
