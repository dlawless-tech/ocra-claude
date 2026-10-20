// whole report as CSV through the SSRS viewer's export url; 'not ready' until it renders
async () => {
  const fr = []; const walk = w => { try { fr.push(w); for (let i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {} }; walk(window);
  const f = fr.find(f => { try { return f.$find && f.$find('ReportViewerControl'); } catch (e) {} });
  const v = f && f.$find('ReportViewerControl')._getInternalViewer();
  if (!v || !v.ExportUrlBase) return 'not ready';
  return await (await f.fetch(v.ExportUrlBase + 'CSV')).text();
}
