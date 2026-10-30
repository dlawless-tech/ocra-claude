---
name: ubereats-weekly-pull
description: Pull each client's weekly Uber Eats pay periods, every store, into the TML's Files UberEats folder by client and week, as the pay period page PNG to attach to the fee journal entry plus a CSV and JSON of the breakdown for building it. Use when asked to pull, download, or save Uber Eats weekly data or backups for NORMS, Bowery Group, Snarf's or FARE, or to catch up missing weeks.
---

# Uber Eats weekly pull

Logs into each client's Uber Eats Manager and saves every store's settled pay periods, so the fee entries can be built and backed up later without opening Uber. One client per run of `pull.sh`; clients run in parallel since each has its own session.

Work from `.scratch/ubereats-weekly-pull` for every command, since `playwright-cli` binds sessions to the folder. `<scripts>` is this skill's `scripts/` folder, written absolute.

## Clients

`scripts/clients.json` holds each client's key, output folder and Teams login sheet. Adding a client is one entry there plus a saved profile name `~/.claude/playwright-profiles/<key>-ubereats`.

| Key | Folder | Teams login sheet (under `~/OCRA`) |
|---|---|---|
| `norms` | `NORMS` | `NORMS - General/Logins - NORMS.xlsx` |
| `bowery` | `Bowery Group` | `Bowery Group - General/Logins - Bowery Group.xlsx` |
| `snarfs` | `Snarfs` | `Snarf's - General/Logins.xlsx` |
| `fare` | `FARE` | `Fare - General/Vendor Logins.xlsx` |

## Logins

```bash
bash <scripts>/uber-login.sh <client>      # session uwp-<client>
```

The login comes **only from the client's Teams login sheet**, the one in the table above: `uber-login.sh` reads the Uber row (first cell starting `Uber`, the email in the row, the cell after it as the password) through `sheet-login.ps1`, so a login changed in Teams is picked up on the next run. A sheet that cannot be read fails the login. `sheet-login.ps1 -Workbook <path> -Mask` shows what it reads without the password.

The saved profiles stay signed in for weeks, so most runs need no code. When one has expired, Uber mails a 4-digit code to the login email; the script waits `WAIT` minutes (default 60) for the human to type it into the open window. Never guess the code, and keep one session per client, since each new login costs another code.

## Pulling

```bash
bash <scripts>/pull.sh <client> <first period end YYYY-MM-DD> <last period end YYYY-MM-DD>
```

For a weekly run, both dates are the Sunday just ended. `STORE=<name fragment>` keeps one store; `OUT=<root>` writes somewhere other than `C:/Users/trici/OCRA/TML's Files - General/UberEats`.

It reads the store list from Uber's store picker each run, so a new or closed store follows Uber. Per store it opens `payments?restaurantUUID=<id>` (the URL picks the store), and calls Uber's own `listPayoutsHistory` and `getEarningsBreakdown`, which answer for the store the page has picked. Per settled period it opens the pay period page, expands it, checks the page's Total payout equals the data, and `capture.js` saves a full-page PNG: header, full breakdown, net taxes note, first page of orders, and fee rates. The page scrolls in an inner `<main>` inside wrappers pinned to the window height, so `capture.js` releases both first; a PNG no taller than the window is deleted and reported. A rerun skips PNGs already saved. It ends with `DONE <client> fails=<n>` and exits nonzero when anything failed.

A period lands under the week of its **end date**. NORMS has stores Uber settles every two weeks; that settlement files under the later Sunday and the earlier week shows the store as `no pay period ending this week`.

## Output

```
UberEats/<Client>/WE <YYYY-MM-DD>/
  <Uber store name> UberEats <start> to <end>.png     one per store, the JE attachment
  UberEats <Client> WE <end>.csv                       one row per store
  UberEats <Client> WE <end>.json                      same rows, for scripts
```

Each row carries the store, address, period, status, deposit date, Uber transaction id, the five section totals (`earnings`, `marketing`, `uberFees`, `amendments`, `net`), `check` (net less the four sections, 0.00 when the sections add up), `note`, then every breakdown line by its Uber path, such as `Earnings/SubtotalInclTax/SubtotalExclTax`, `Marketing/AdSpendInclTax/AdSpendExclTax`, `UberFees/MarketplaceFeeInclTax`. Uber shows Marketing and Uber Fees negative; the data keeps Uber's signs. Lines a store lacks that week are blank.

The pull is done when the log ends `fails=0` and each week's summary shows every store either with a settled period or `no pay period ending this week`. Report any `FAIL` line, any `note`, and the per-week store count and net total that `summarize.js` prints.

Close the sessions when finished: `playwright-cli -s=uwp-<client> close`.
