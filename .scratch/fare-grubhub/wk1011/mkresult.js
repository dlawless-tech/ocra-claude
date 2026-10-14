const fs=require("fs");const L=require("./lines.json");
const ids=Object.fromEntries(fs.readFileSync("ids.txt","utf8").trim().split(/\r?\n/).map(l=>l.split("|")));
const src="source was the store's approved 9/30 monthly GrubHub entry; its 9/27 weekly entry in wk0927/ids.txt no longer exists in R365";
const stores=L.stores.map(s=>{const w=[src];if(s.zero)w.push("no Grubhub transactions 10/6 - 10/12; entry posted at 0.00 (grid shows stale header 601.08, lines are 0.00)");
return {store:s.store,status:"approved",amount:s.amount,net:s.net,transactionId:ids[s.store],warnings:w};});
const r={period:"10/6/2026 - 10/12/2026",date:"10/11/2026",note:"All ten stores posted, tied to Grubhub, backup attached and approved. The weekly GrubHub entries for 9/6 - 9/27 were deleted from R365, so this week copied the 9/30 monthly entries. Another session is posting unapproved GrubHub entries dated 10/1; this run left them alone.",stores};
fs.writeFileSync("result.json",JSON.stringify(r,null,1));console.log(stores.length, stores.reduce((a,s)=>a+s.amount,0).toFixed(2));
