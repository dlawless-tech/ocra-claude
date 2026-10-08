const fs=require("fs"); const s=fs.readFileSync("grid.txt","utf8").split("\n").filter(l=>l.startsWith("10/3/2026"));
fs.writeFileSync("ids.txt", s.map(l=>{const a=l.split("|");return a[1]+"|"+a[2]}).join("\n")+"\n"); console.log(s.length);
