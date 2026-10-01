const fs=require('fs');const rep=(f,pairs)=>{let s=fs.readFileSync(f,'utf8');for(const [a,b] of pairs){if(!s.includes(a))throw new Error(f+' no match '+a);s=s.split(a).join(b)}fs.writeFileSync(f,s)};
rep('build.js',[
 ["const OAK='FARE Oak Park';","const OAK='(none)';const OAKL='FARE Oak Park';"],
 ["const oak=SA.find(s=>s.loc===OAK);","const oak=SA.find(s=>s.loc===OAKL);"],
 [/const OAKNOTE=`[^`]*`;/.exec(fs.readFileSync('build.js','utf8'))[0],"const OAKNOTE=`Oak Park had no Grubhub fee entries for Jan-Aug; its first, the unapproved 9/6 weekly entry, was posted 9/30, so nearly all of its Grubhub fees show as not booked.`;"],
 [", Oak Park excluded. The",". The"],
 ["recorded it. Oak Park excluded.'","recorded it.'"],
 [/note\(ws,r\+1,`Holding's 28,283.94 also includes[^;]*;/.exec(fs.readFileSync('build.js','utf8'))[0],"note(ws,r+1,`Oak Park is the largest piece: AJE credit ${f2(oak.aje)} vs Oak Park deposits at Holding ${f2(oak.depHolding)}, because its fees were never booked.`);"],
 ["'Oak Park (Grubhub 12565904) excluded.'","''"]]);
const d=fs.readFileSync('disc.js','utf8');
rep('disc.js',[
 [" '+OAKNOTE);"," Oak Park had no Grubhub fee entries for Jan-Aug.');"],
 [/note\(ws,r\+1,'1103 After Fixes = posted balance less the fee JE and 2270 line plus the AJE fix\.[^;]*;/.exec(d)[0],"note(ws,r+1,'1103 After Fixes = posted balance less the fee JE and 2270 line plus the AJE fix. The AJE fix column nets to zero.');"]]);
