const fs=require('fs');const rep=(f,pairs)=>{let s=fs.readFileSync(f,'utf8');for(const [a,b] of pairs){if(!s.includes(a))throw new Error(f+' no match '+a);s=s.split(a).join(b)}fs.writeFileSync(f,s)};
rep('disc.js',[["SEPTAMT=2164.50","SEPTAMT=2893.60"],["LaSalle, Sterling, Logan (9/18); 6 stores (9/25)","LaSalle, Oak Park, Sterling, Logan (9/18); 7 stores (9/25)"],["9/18 payouts for LaSalle, Sterling and Logan","9/18 payouts for LaSalle, Oak Park, Sterling and Logan"],
 ["'; the Grubhub fee JEs booked '+f2(t(s=>s.feesGLex))+'. Loop","'; the Grubhub fee JEs booked '+f2(t(s=>s.feesGLex))+'. Oak Park had no fee JE before 9/6 ('+f2(oak.Cex)+'). Loop"]]);
rep('report.js',[["SEPTAMT=2164.50","SEPTAMT=2893.60"],
 [" Oak Park is excluded because it has no Grubhub fee entries in R365."," All ten stores included."],
 ["Excluding Oak Park, 1103 Grubhub","1103 Grubhub"],
 ["The 9/18 payouts for LaSalle, Sterling and Logan (755.79)","The 9/18 payouts for LaSalle, Oak Park, Sterling and Logan (1,313.02)"],
 ["The 9/25 payouts (2,726.70)","The 9/25 payouts (3,112.61)"],
 ["the Grubhub fee JEs booked ${f(t(s=>s.feesGLex))}. Loop","the Grubhub fee JEs booked ${f(t(s=>s.feesGLex))}. Oak Park had no Grubhub fee JE before its first weekly entry on 9/6 (${f(by(/Oak Park/).Cex)}). Loop"]]);
let s=fs.readFileSync('report.js','utf8');s=s.replace(/<p>The AJE fix column nets to \$\{f\(-oak\.ajeX\)\}[^.]*\.[^.]*\./,"<p>The AJE fix column nets to zero: it moves the 28,283.94 out of Holding and back to the stores, Oak Park the largest at ${f(oak.ajeX)}.");s=s.replace(/ Holding's 28,283\.94 includes \$\{f\(oak\.ajeX\)\} from the AJE credit to Oak Park\./," Holding's 28,283.94 includes ${f(oak.ajeX)} from the AJE credit to Oak Park, whose fees were never booked.");fs.writeFileSync('report.js',s);
