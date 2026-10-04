// playwright-cli eval body: every NORMS DoorDash payout in a window, as the Payouts page loads them.
// The caller swaps START/END (ISO, UTC) in before eval; see SKILL.md.
async () => {
  const body = { storeIds: [], businessIds: [4360], organizations: [], dateRange: { startDate: 'START', endDate: 'END' },
    filtersList: [], storeFilterGranularity: null, page: { offset: 0, limit: 200 } };
  const r = await fetch('/merchant-analytics-service/api/v2/payout_summaries', { method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json', 'accept-language': 'en-US', timezone: 'America/Los_Angeles' }, body: JSON.stringify(body) });
  return await r.text();
}
