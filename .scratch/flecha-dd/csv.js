async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d=seen.find(x=>/ReportViewer.aspx/.test(x.defaultView.location.href)); const w=d.defaultView;
const iv=w.$find('ReportViewerControl')._getInternalViewer(); const base=iv.ExportUrlBase;
const r=await fetch(base+'CSV'); const t=await r.text(); return 'LEN '+t.length+'\n'+t; }
