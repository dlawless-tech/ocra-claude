// playwright-cli eval body: every NORMS DoorDash payout in a window, as the Payouts page loads them.
// The caller swaps 2026-10-01T07:00:00.000Z/2026-10-16T06:59:59.999Z (ISO, UTC) in before eval; see SKILL.md.
async () => {
  const body = { storeIds: [68037, 85344], businessIds: [4360], organizations: [], dateRange: { startDate: '2026-10-01T07:00:00.000Z', endDate: '2026-10-16T06:59:59.999Z' },
    filtersList: [], storeFilterGranularity: null, page: { offset: 0, limit: 200 } };
  const r = await fetch('/merchant-analytics-service/api/v2/payout_summaries', { method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json', 'accept-language': 'en-US', timezone: 'America/Los_Angeles' }, body: JSON.stringify(body) });
  return await r.text();
}
