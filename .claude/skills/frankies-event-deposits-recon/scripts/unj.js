const s=require('fs').readFileSync(0,'utf8');const B=String.fromCharCode(92);process.stdout.write(s.split(B+'n').join('\n').split(B+'"').join('"')+'\n');
