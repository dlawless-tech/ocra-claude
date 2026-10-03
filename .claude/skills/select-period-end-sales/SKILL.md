---
name: select-period-end-sales
description: Post the two period-end sales journal entries for 370 Select Industries into NORMS Restaurant365, P<n>'<yy> Sales and P<n>'<yy> Sales (Nevada), booking the period's commissary sales to the stores from the 2026 Select Intercompany Sales workbook, with the Monthly Sales Recap attached. Use when asked to fill, balance, or approve the Select Sales entries in R365, or to check a period's Select sales against the recap.
---

# Select Industries period-end sales

Select Industries, the commissary, bills the stores each period. Two files arrive in:

```
c:\Users\trici\OCRA\NORMS - General\Journal Entries\Select Industries\Sales\
  2026 Select Intercompany Sales.xlsm      one tab per period, P1 ... P13
  Monthly Sales Recap- Period 10.pdf       the JDE recap the tab is keyed from
```

Ask the human for the files if the period's PDF is missing or its tab is empty.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/norms-grubhub/scripts/r365-login.sh ss
```

## The period

NORMS runs four-week periods ending on a Saturday. Both entries are dated that Saturday and numbered `P<nn>'<yy> Sales` and `P<nn>'<yy> Sales (Nevada)`, two-digit period: `P09'26`, `P10'26`. P10 2026 ran 9/6 through 10/3/2026.

## Step 1: build the lines

```bash
node <skill>/scripts/build-lines.js "<2026 Select Intercompany Sales.xlsm>" <n> > lines.json
```

It reads the `P<n>` tab: column Z (CA Total) for the CA entry, column AA (NV 72-LV) for Nevada. Each entry has four lines at `370 - Select Industries`, blank comments:

```
debit   1140 - Accounts Receivable-Other   row 20  Total NT & T
credit  4020 - Food Non-Taxable            row 11  Total NT
credit  4010 - Food Taxable                row 28  Net Sales (taxable less tax)
credit  2115 - Sales Tax Payable           row 18 Total T  less the rounded row 28
```

Tax takes the rounding so each entry foots to the recap. The script stops when A2 does not name the period, the period end is not a Saturday, or row 11 plus row 18 misses row 20.

**Tie the tab to the PDF** before posting. Each category total on the PDF's `Total` lines matches its row on the tab, CA as the sum of every store but 72-LV:

| PDF section | Tab row |
|---|---|
| FOOD Non Taxable | 7 Food |
| PAPER Non Taxable | 8 Paper |
| MISCL Non Taxable | 10 Misc |
| PAPER, EQUIP, UNFRM, MISCL Taxable | 14 to 17 |

The grand total of every section equals AB20. P10 2026: CA 963,382.29, NV 20,844.90, total 984,227.19. A mismatch means the tab was keyed from a different run; take it to the human.

## Step 2: the entries

The two entries for the period usually already exist as Unapproved templates at 0.00, dated the period end. Find them from All Transactions (soft navigation, see the automation doc):

```bash
playwright-cli -s=ss eval "$(cat <skill>/scripts/find-entries.js)"
```

It lists the latest `P<nn>'<yy> Sales` rows with status, amount and `TransactionId`. An Approved row carrying an amount means the period is done; stop and report it. An Approved template at 0.00 needs **Unapprove** first: a real click on `#Unapprove > a`, then `li[data-testid="unapproveMenuItem"]`. With no template, duplicate the prior period's entry through **Action > Duplicate** and take the new id.

## Step 3: fill, verify

```bash
bash <skill>/scripts/fill-entry.sh ss <ca id> lines.json ca
bash <skill>/scripts/fill-entry.sh ss <nv id> lines.json nv
```

It sets date, number and the four lines through `model.set`, saves, reloads, and prints each line against `lines.json`, ending `MATCH` only when date, number, every amount and the 370 location agree. The P10 Nevada template came numbered `P10'26 Sales ( Nevada)`; the script writes the number from `lines.json`, which fixes it.

## Step 4: attach, approve, file

Attach the period's recap PDF to both entries from a freshly loaded entry:

```bash
cp "<Monthly Sales Recap- Period N.pdf>" .
bash <skills>/danny-coops-payroll/scripts/attach.sh ss "<Monthly Sales Recap- Period N.pdf>"
```

Approve each with a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`; the `Transaction/Approve` response reads `"Successfully Approved."`. Rerun `find-entries.js`: both rows read Approved at the `total` in `lines.json`.

Move the PDF into `Completed` inside the Sales folder, which syncs to Teams. The workbook is a running yearly file and stays.

Report both entries' lines, the PDF tie, and status.

## No beginning balance

Each entry books the period's sales, so the amounts come straight from the tab. GL Account Detail for 1140 at 370 shows each period's entry debiting the full period total, and the store AP transfers clearing it weekly. 2115 is paid down by CDTFA and NV tax payments between periods, so its balance never drives the entry.

## History

| Period | CA 1140 | CA 4010 | CA 2115 | NV 1140 | NV 4010 | NV 2115 |
|---|---|---|---|---|---|---|
| P7 2026 | 1,044,261.48 | 39,469.04 | 3,794.35 | 25,916.07 | 1,025.73 | 85.98 |
| P8 2026 | 1,070,049.48 | 29,071.11 | 2,854.40 | 27,067.31 | 1,114.20 | 93.39 |
| P9 2026 | 1,023,151.90 | 31,645.67 | 3,050.03 | 28,118.14 | 559.53 | 46.91 |
| P10 2026 | 963,382.29 | 37,714.15 | 3,666.26 | 20,844.90 | 922.22 | 77.28 |

P7 through P9 were keyed by hand. 1140 and 4020 tie to the tab, but the tax line runs 0.54 to 0.62 above row 29 on CA and 0.02 above on NV, with 4010 lower by the same amount; no rounding of the tab reproduces it. P10 was the first run of this skill, posted from the tab and approved 10/3/2026. On that run `build-lines.js`, `find-entries.js`, and the read-back check in `fill-entry.sh` ran as scripts; the fill and save were driven by hand with the same `set-lines.tpl.js`, so `fill-entry.sh` end to end and the Duplicate path are untested.
