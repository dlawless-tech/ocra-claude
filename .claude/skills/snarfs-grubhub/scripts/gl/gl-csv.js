// Fetches the rendered report as CSV through the SSRS viewer's export url.
async () => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } }; walk(document);
  const d = seen.find(x => /ReportViewer.aspx/.test(x.defaultView.location.href)); if (!d) return 'NOTREADY';
  let iv; try { iv = d.defaultView.$find('ReportViewerControl')._getInternalViewer(); } catch (e) { return 'NOTREADY'; }
  const r = await fetch(iv.ExportUrlBase + 'CSV'); return await r.text();
}
