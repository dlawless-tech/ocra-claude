# tocsv.sh <raw> <out>
node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const m=t.match(/### Result\n([\s\S]*?)\n### Ran/);if(!m){console.log("NOTREADY");process.exit(1)}const s=JSON.parse(m[1]);require("fs").writeFileSync(process.argv[2],s.replace(/^LEN \d+\n/,""));console.log("ok "+s.length)' "$1" "$2"
