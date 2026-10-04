---
name: bowery-sage-ap-begbal
description: Bring a Bowery store's Sage AP Aging beginning balance into Bowery Group Restaurant365, diffing the Sage tab against R365's AP Aging and the store's Chase card account, then importing the missing card charges as Bank Withdrawal - Beg Bal and card credits as Bank Deposit - Beg Bal. Use when asked to compare the Sage AP Aging to R365 for a Bowery store, to build or run the Beg Bal withdrawal or deposit import, or to clear the go-live difference on a Bowery AP Aging.
---

# Sage AP Aging beginning balance into Bowery R365

Sage's final AP Aging lists each store's open items at go-live. R365 holds the same balance as a lump: the AP Aging shows an `UNASSIGNED VENDOR` line, "Difference of AP account and open AP transactions at go-live". The Chase card items behind that lump go in as Bank Withdrawals (charges) and Bank Deposits (credits) on the store's card account, marked `From Sage`. A journal entry numbered `AP TO <last4> CC` then moves the imported net from AP to the card account.

```
C:\Users\trici\OCRA\TML's Files - General\Downloads\
  AP Aging_09.04.26.xlsx                               Sage, one tab per store
  <Store> Bank Withdrawal - Beg Bal <label>.csv        written by this skill
  <Store> Bank Deposit - Beg Bal <label>.csv           written by this skill
```

`scripts/stores.json` maps each Sage tab to its legal entity, card account and import Location. Only Cookshop has run (10/4/2026). For the other stores, check the Location spelling against the importer's lookup on the first run, since `Vic’s` and `Rosie’s` carry a curly apostrophe in R365.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for the login. Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh bw
```

## Step 1: read the Sage tab

```bash
node <skill>/scripts/read-sage-aging.js "<AP Aging.xlsx>" "Cookshop AP" > sage.json
```

Excel refuses to open the Sage export, so the script reads the sheet XML out of the zip. Amounts come from the Total Payables column. Done when the stderr total equals the tab's `Report Total:` row (Cookshop 16,725.24).

## Step 2: pull R365

```bash
bash <skill>/scripts/pull-report.sh bw aging "156 Tenth" 8/30/2026 aging.csv
bash <skill>/scripts/pull-report.sh bw gl 202-01 1/1/2026 <today> gl.csv
```

`aging` runs AP Aging, Detail, Show Unapproved Yes, for the legal entity, as of go-live. `gl` runs GL Account Detail on the card account, line by line with full comments. Each prints the parameters the dialog ran with; read them back before trusting the CSV. The parameter widgets ignore typing, so `eval/set-params.js` sets them through Angular. `eval/export-csv.js` fetches the whole report as CSV through the SSRS viewer.

## Step 3: diff and build the files

```bash
node <skill>/scripts/build-imports.js "Cookshop AP" sage.json aging.csv gl.csv "<Downloads>" "Pre 8.9.26"
```

Card items are matched against the card account by Paid To (charges) or Check Memo (credits) plus amount. Any card item not found goes into the withdrawal or deposit file. All other vendors are matched against the R365 AP Aging.

Read the summary before importing:

- **AP, missing from R365 aging** lists non-card items. These are AP invoices or credit memos, so they need a different import; report them to the human.
- The withdrawals less the deposits should equal the `UNASSIGNED VENDOR` go-live difference (Cookshop 9,108.89). A gap means part of the lump is something other than card items; report it.

Show the human both files and the totals, and import once they confirm.

## Step 4: import

The Importer opens at `/#/form/Importer`. Open it in a new tab with `playwright-cli -s=bw tab-new https://bowerygroup.restaurant365.com/#/form/Importer`. It is a Kendo wizard:

1. **Options** combobox: click it, type the option name (`Bank Withdrawal - Beg Bal` or `Bank Deposit - Beg Bal`), then click the matching `option` from a fresh snapshot.
2. **Type**: click it, type `Create`, then click option `Create New`.
3. **Upload File** opens an "Upload File" box with a hidden `#importTest` input. Set the file through Playwright, not a click:
   ```bash
   playwright-cli -s=bw run-code "async page => { await page.locator('#importTest').setInputFiles('<windows path, forward slashes>'); return 'ok' }"
   ```
   It answers with `POST /ServiceStack/Importer` and `ImporterData`. The `ImporterData` response lists the template's fields and which ones are `required`.
4. **Next** goes to Map Fields. The headers map one to one onto the saved template's fields. Click **Next** again.
5. **Import**. Done when the page reads `(<rows>) <option> Imported Successfully`, with the row count matching the file.

Import the withdrawals, then the deposits.

When the human drives the import in this browser instead, Playwright captures the file picker and the native dialog never opens. Supply the file with `playwright-cli -s=bw upload <file>` from the Importer's tab; the tab list shows `[File chooser]` while one is waiting.

Importer behavior:

- Number is required on Bank Deposit - Beg Bal; both files use `CC`.
- An apostrophe in Paid To is stored doubled (`AMY''S BREAD`). `build-imports.js` matches through this.
- Each imported Bank Expense or Bank Deposit posts both its debit and its credit to the card account, so the account nets to zero until the `AP TO` journal entry posts.

## Step 5: verify

Re-run Step 2's `gl` pull and Step 3. Done when the summary reads `card, to withdraw: 0` and `card, to deposit: 0`.

## Step 6: the AP TO CC journal entry

Cookshop's 8/30/2026 entry `AP TO 8281 CC` credits 202-01 for 7,872.05, the net of the 8/9-8/30 import. Each new import needs a matching entry for its net (Cookshop pre-8/9: 9,292.76 withdrawals less 183.87 deposits, 9,108.89). Confirm the date, amount and AP side with the human before posting.
