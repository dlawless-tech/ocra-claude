const fs=require('fs');const rep=(f,pairs)=>{let s=fs.readFileSync(f,'utf8');for(const [a,b] of pairs){if(!s.match(a))throw new Error(f+' no match '+a);s=s.replace(a,b)}fs.writeFileSync(f,s)};
const SEPT="Weekly entries began 9/6 (period 9/1-9/7) and are posted, unapproved, for every store. The four copied Logan entries (692.20 each, 9/6-9/27) seen earlier today were removed. Weeks 9/8-9/14 and 9/15-9/21 are not booked yet; 9/13 entries were mid-posting at the time of this pull, so GL fees are taken through 9/6.";
rep('build.js',[
 [/const OAKNOTE=`Oak Park is excluded: it has no Grubhub fee entries in R365\./,"const OAKNOTE=`Oak Park is excluded: it has no Grubhub fee entries for Jan-Aug (its first, the unapproved 9/6 weekly entry, was posted 9/30)."],
 [/title\(ws,'September Weekly Grubhub Fee JEs','[^']*'\)/,"title(ws,'September Weekly Grubhub Fee JEs (through 9/6)','"+SEPT+"')"]]);
rep('disc.js',[
 [/\['Sept weekly fee JEs copied','Logan Square',2768.80,'[^']*','[^']*'\]/,"['September not yet booked','All',SEPTAMT,'"+SEPT+"','Post the 9/13 and 9/20 weekly entries with the fare-grubhub skill. Already inside the fee variance.']"],
 [/Logan Square is over-booked \('\+f2\(by\(\/Logan\/\)\.Cex\)\+'\)\. /,"Of the gap, '+f2(SEPTAMT)+' is the 9/8-9/21 weeks not booked yet. "]]);
rep('report.js',[
 [/<li><b>September fee JEs are copies\.<\/b>[^<]*<\/li>/,"<li><b>September is booked only through 9/6.</b> "+SEPT+" Grubhub fees for 9/8-9/21 not yet booked: ${f(SEPTAMT)} (inside the fee gap above).</li>"],
 [/ Logan Square is over-booked by \$\{f\(-lg\.Cex\)\}\./," Of the gap, ${f(SEPTAMT)} is the 9/8-9/21 weeks not booked yet."],
 [/, and reverse the four copied Logan September entries\./,", and post the 9/13 and 9/20 weekly entries."]]);
