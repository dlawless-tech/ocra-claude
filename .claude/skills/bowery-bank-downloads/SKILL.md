---
name: bowery-bank-downloads
description: Retrieve the prior week's bank activity into Bowery Group Restaurant365 for every connected account on the Bank Activity page. Use when asked to download, pull, or retrieve Bowery bank activity or bank feeds in R365, or to refresh a Bowery account's transactions for a week.
---

# Weekly bank activity retrieve for Bowery

Bank Activity pulls each account's transactions from its bank connection into the Unmatched grid, where the `ocra-r365:r365-bank-activity` skill codes them. This skill does only the pull: every account on the dropdown, in list order, retrieved over a custom date range. An account whose connection is not `Connected` is skipped.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for the login and the side-menu walk. Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh bd
```

## The week

Sunday to Sunday: the most recent Sunday before today back to the Sunday before it, both dates inclusive. Run on Monday 9/28/2026, that is `9/20/2026` to `9/27/2026`. The page's `Last Activity Upload Date` reads the prior run's start (9/20/2026 on that run), and the shared Sunday comes back as `duplicatesFound`, not as new rows.

## Step 1: open Bank Activity

From the home dashboard open the side menu (the first unlabeled `button` in the banner), then `button "Accounting"`, `button "Banking"`, and `link "Bank activity"`. It opens in a second tab; `tab-select 1`. The page is `https://bowerygroup.restaurant365.com/#/form/BankActivityForm/00000000-0000-0000-0000-000000000000`.

## Step 2: retrieve every account

```bash
bash <skill>/scripts/retrieve-all.sh bd 9/20/2026 9/27/2026
```

For each account it opens the `Select Checking Account` dropdown, picks the next option, answers **No** to the warning, reads the connection status, and for a `Connected` account clicks the pen/paper icon beside Retrieve Activity, fills Start and End, reads both back from the date pickers, and clicks the dialog's Retrieve Activity. It appends one line per account to `retrieve.log`:

- `RETRIEVED: <account> {"transactionsRetrieved":N,"duplicatesFound":N,"error":null,"result":1}`, the server's answer to `RetrieveBankActivityForGlAccount`.
- `SKIPPED: <account> (<status>)` for `Not Connected` or `Password Needed`.
- `END` after the last account.
- `FAIL:` names the account and the step. It stops there; rerun from that account with a fourth argument, its 1-based list position.

`retrieve-account.sh bd <n> <start> <end>` runs one account alone.

The step is done when `retrieve.log` ends on `END` and every `RETRIEVED` line carries `"error":null` and `"result":1`.

## The page's quirks

- **The warning.** `This account has already been refreshed today. Would you like to query the bank again to refresh the data?` shows on selecting an account and again after its retrieve. **No** keeps the bank's last sync; **Yes** asks the bank to sync again. The popup is often missing from snapshots while its `.k-overlay` swallows every click, so the scripts detect it from the DOM (`.r365-confirmation-popup-window`) and answer through `button[data-testid=cancelText]`.
- **Status.** Three blocks sit under `Connection Status:`, one visible at a time: `#greenStatus` Connected, `#goldenrodStatus` Not Connected, `#redStatus` Password Needed. Read the one without `ng-hide`.
- **Selectors.** The account input is `input[name=bankActivityBankAcounts_input]` (the misspelling is R365's), its list `#bankActivityBankAcounts_listbox li`, the pen/paper icon `[data-testid=chooseDateRangeButton]`, the dates `#start` and `#end` (Kendo date pickers), and the dialog's retrieve button carries `ng-click="handlers.retrieveActivity('startEndDate')"`. The ribbon's own Retrieve Activity (`retrieveAll`) pulls without a date range.
- **The dropdown arrow** sometimes ignores a click; the script retries until the list shows.

## Report

A table of every account: retrieved (with `transactionsRetrieved` and `duplicatesFound`) or skipped (with its status). Name each skipped account's status, since `Password Needed` means the client must reconnect it under **Manage Bank Connections**. Flag an operating or payroll account that retrieves 0, since the CDs and savings are the accounts that usually do.

## First run

9/28/2026, week 9/20 to 9/27/2026. The dropdown held 19 accounts: the 13 cash accounts (`100-xx`) were Connected and retrieved, and the six credit cards (`202-xx`) were Not Connected and skipped. `100-10 - Cash - Cookshop Operating (4360)` retrieved 0 with its feed synced that day.
