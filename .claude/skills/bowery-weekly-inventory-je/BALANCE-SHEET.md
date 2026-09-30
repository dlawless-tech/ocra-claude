# Starting a week from the balance sheet

Cookshop and Shukette carried inventory on the books at 8/30/2026 that differed from Craftable's 8/30 counts, and their first weekly entries, dated 9/6/2026, had changed from the Craftable counts. They were rebuilt on 9/30/2026 as the 9/6 count less the 8/30 balance sheet balance. Shuka, Rosie's and Vic's took their 8/30 balances from Craftable through `Starting Inventory` entries, so the two starts agree for them.

Use this when a week's changes must start from what the books hold rather than from a Craftable count.

## Step 1: run the balance sheet

In R365 My Reports (soft navigate to `/react/reports-management/legacy/MyReports`, as the automation notes describe), open **Customize** on the **Balance Sheet** card and set:

| Parameter  | Setting                     | How                                                        |
|------------|-----------------------------|------------------------------------------------------------|
| Report Type | Legal Entity Side by Side  | its `md-autocomplete`: `r365options.querySearch('')`, pick the item, `selectedItemChange` |
| Filter By / Filter | Legal Entity, All Selected | as saved                                           |
| As Of      | the prior Sunday, e.g. 8/30/2026 | `fill` the `AsOf` textbox from a fresh snapshot ref, then Tab |
| Detail Level | Detail                    | button group scope, `buttonSelected`                       |
| Rounding   | No Rounding                 | button group scope, `buttonSelected`                       |

Read the dialog back before running, then run from the dialog's own Run button (`runReport($event)`). The report opens in a new tab at `/#/ReportViewer`.

## Step 2: read the inventory rows

The accessibility snapshot carries the figures as links inside cells. Each entity column is a spacer cell then a value cell, in this order: 156 Tenth Avenue (Cookshop), 230 Ninth Avenue (Shukette), 31 Great Jones (Vic's), 38 Macdougal (Shuka), Bowery Group Corp, Second Street (Rosie's), Total. A blank value cell is zero; Cookshop and Shukette had no N/A balance at 8/30.

Write `start.json` from the `Inventory-Liquor`, `Inventory-Wine`, `Inventory-Beer` and `Inventory-N/A Beverage` rows:

```json
{ "Cookshop": { "Liquor": 28671.05, "Wine": 22987.42, "Beer": 2168.02, "N/A": 0 } }
```

Check each store's `Total Inventory` against the sum of its four rows, and a store with a `Starting Inventory` entry against that entry's amount.

## Step 3: build and correct

```bash
node <skill>/scripts/build-lines.js audits.json start.json > lines.json
```

`start.json` replaces the prior week's counts, so an Unassigned line in the prior week no longer stops the run. Correct the week's entries with `fix-entry.sh`. The following week's entries already change from Craftable counts and stay as they are.
