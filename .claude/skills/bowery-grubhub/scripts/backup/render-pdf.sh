#!/bin/bash
# Render backup pages to PDF. Chrome blocks file: URLs, so serve the folder on localhost.
# usage: render-pdf.sh <html dir> <id> <out.pdf> [<id> <out.pdf> ...]   (writes <html dir>/<id>.html to out.pdf)
DIR=$1; shift; PORT=8765
node -e 'const[d,p]=process.argv.slice(1);require("http").createServer((q,s)=>require("fs").readFile(d+"/"+decodeURIComponent(q.url.slice(1)),(e,b)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{"content-type":"text/html; charset=utf-8"});s.end(b)})).listen(+p,"127.0.0.1")' "$DIR" $PORT &
SRV=$!; sleep 2
playwright-cli -s=bpdf open about:blank >/dev/null 2>&1
while [ $# -ge 2 ]; do
  playwright-cli -s=bpdf goto "http://127.0.0.1:$PORT/$1.html" >/dev/null 2>&1; sleep 2
  mkdir -p "$(dirname "$2")"; playwright-cli -s=bpdf pdf --filename="$2" >/dev/null 2>&1
  echo "$(stat -c %s "$2" 2>/dev/null || echo MISSING) $2"; shift 2
done
playwright-cli -s=bpdf close >/dev/null 2>&1; kill $SRV 2>/dev/null
