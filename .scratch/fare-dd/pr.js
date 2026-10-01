const s=require('fs').readFileSync('je-all.txt','utf8');
console.log(s.replace(/\n/g,'\n').replace(/---PAGE---[\s\S]*?(?=########|$)/g,m=>{const i=m.indexOf('items');return 'PAGE '+m.slice(i-200,i+400).replace(/\n/g,' ~ ')+'\n'}));
