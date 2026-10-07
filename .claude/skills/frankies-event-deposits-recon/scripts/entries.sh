#!/bin/bash
# Fetch entries by id through R365's ServiceStack API and print header + 2015/1242 lines (all lines with -a).
# usage: entries.sh <session> [-a] <id>... ; also writes entries.json (full detail) in the working dir
SK=$(cd "$(dirname "$0")" && pwd)
S=$1; shift; ALL=0; [ "$1" = "-a" ] && { ALL=1; shift; }
IDS=$(echo "$@" | tr ' ' ',')
playwright-cli -s=$S eval "async () => { const p=(u,id)=>fetch('/ServiceStack/'+u,{method:'POST',headers:{'content-type':'application/json; charset=UTF-8','accept':'application/json','x-r365-client-app':'angular'},body:JSON.stringify({transactionId:id,transactionType:0})}).then(r=>r.json()); const out=[]; for(const id of '$IDS'.split(',')){ const h=await p('GetTransaction',id); const d=await p('GetTransactionDetails',id); out.push({id,num:(h.number||'').trim(),name:(h.name||'').trim(),date:h.date,comment:h.comment,status:h.approvalStatus,lines:d.map(x=>({acct:x.glAccount,dr:+x.debit,cr:+x.credit,c:(x.comment||'').trim(),loc:x.location}))}); } window.__fkE=out; return out.length; }" >/dev/null 2>&1
playwright-cli -s=$S eval "() => JSON.stringify(window.__fkE||[])" 2>&1 | sed -n '/### Result/{n;p;}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=JSON.parse(JSON.parse(s));require("fs").writeFileSync("entries.json",JSON.stringify(e,null,1));for(const x of e){console.log(x.date.split(" ")[0]+" | "+x.name+" | status "+x.status);for(const l of x.lines)if('$ALL'==="1"||/^(2015|1242)/.test(l.acct))console.log("   "+[l.acct,l.dr.toFixed(2),l.cr.toFixed(2),l.c].join(" | "))}})'
