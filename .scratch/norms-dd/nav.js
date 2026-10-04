() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); window.dispatchEvent(new PopStateEvent('popstate')); return 'ok'; }
