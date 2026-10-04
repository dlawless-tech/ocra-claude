// the dialog's own Run; the cards' Run buttons run default parameters
() => { const b = [...window.frames[1].document.querySelectorAll('md-dialog button')].find(b => (b.getAttribute('ng-click') || '').startsWith('runReport(')); if (!b) return 'FAIL: no run button'; b.click(); return 'clicked'; }
