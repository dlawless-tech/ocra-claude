---
name: bowery-bank-downloads
description: Retrieve the prior week's bank activity into Bowery Group Restaurant365 for every connected account on the Bank Activity page. Use when asked to download, pull, or retrieve Bowery bank activity or bank feeds in R365, or to refresh a Bowery account's transactions for a week.
---

# Weekly bank activity retrieve for Bowery

Bank Activity pulls each account's transactions from its bank connection into the Unmatched grid, where the `ocra-r365:r365-bank-activity` skill codes them. This skill does only the pull: every account on the dropdown, in list order, retrieved over a custom date range. An account whose connection is not `Connected` is skipped.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for the login and the side-menu walk. Browser sessions are shared across the whole repo, so this skill uses its own session name, `bbd`; another skill using the same name would drive the same browser:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh bbd
```

## The week

The prior week, Sunday through Saturday, both dates inclusive. The scheduled run on Sunday 10/11/2026 pulls `10/4/2026` to `10/10/2026`. A manual run later in the week pulls the same week as that week's Sunday run.

## Step 1: open Bank Activity

```bash
bash <skill>/scripts/open-bank-activity.sh bbd
```

It goes straight to `https://bowerygroup.restaurant365.com/#/form/BankActivityForm/00000000-0000-0000-0000-000000000000` in the current tab and logs in again once if that drops the session.

## Step 2: retrieve every account

```bash
bash <skill>/scripts/retrieve-all.sh bbd 9/20/2026 9/27/2026
```

For each account it opens the `Select Checking Account` dropdown, picks the next option, answers **No** to the warning, reads the connection status, and for a `Connected` account clicks the pen/paper icon beside Retrieve Activity, fills Start and End, reads both back from the date pickers, and clicks the dialog's Retrieve Activity. It appends one line per account to `retrieve.log`:

- `RETRIEVED: <account> {"transactionsRetrieved":N,"duplicatesFound":N,"error":null,"result":1}`, the server's answer to `RetrieveBankActivityForGlAccount`.
- `SKIPPED: <account> (<status>)` for `Not Connected` or `Password Needed`.
- `END` after the last account.
- `FAIL:` names the account and the step. It stops there; rerun from that account with a fourth argument, its 1-based list position.

`retrieve-account.sh bbd <n> <start> <end>` runs one account alone.

The step is done when `retrieve.log` ends on `END` and every `RETRIEVED` line carries `"error":null` and `"result":1`.

## The page's quirks

- **The warning.** `This account has already been refreshed today. Would you like to query the bank again to refresh the data?` shows on selecting an account and again after its retrieve. **No** keeps the bank's last sync; **Yes** asks the bank to sync again. The popup is often missing from snapshots while its `.k-overlay` swallows every click, so the scripts detect it from the DOM (`.r365-confirmation-popup-window`) and answer through `button[data-testid=cancelText]`.
- **Status.** Three blocks sit under `Connection Status:`, one visible at a time: `#greenStatus` Connected, `#goldenrodStatus` Not Connected, `#redStatus` Password Needed. Read the one without `ng-hide`.
- **Selectors.** The account input is `input[name=bankActivityBankAcounts_input]` (the misspelling is R365's), its list `#bankActivityBankAcounts_listbox li`, the pen/paper icon `[data-testid=chooseDateRangeButton]`, the dates `#start` and `#end` (Kendo date pickers), and the dialog's retrieve button carries `ng-click="handlers.retrieveActivity('startEndDate')"`. The ribbon's own Retrieve Activity (`retrieveAll`) pulls without a date range.
- **The dropdown arrow** sometimes ignores a click; the script retries until the list shows.

## Sunday scheduled run

`scripts/sunday-run.ps1` runs from Task Scheduler on Sundays at 7:00 (`scripts/register-task.ps1` sets it up as `Bowery Bank Downloads - Sunday`; a missed run starts at next sign-in). It needs no Claude session: it logs in, opens the page, and runs `retrieve-all.sh` in `.scratch/bowery-bank-downloads/wk<MMDD>`, named for the run's Sunday, under its own browser session `bbk`, so a manual run under `bbd` is left alone. On a `FAIL` it logs in again and resumes from that account, three tries, then closes its browser session. It writes `started.txt` first, so the week runs once; `-Force` reruns it.

It then posts a card to the Bank Activity Teams channel through `scripts/notify-teams.ps1`: one line per account, with Brandy Sanders tagged and told the week is downloaded. The title says `FAILED` instead when `retrieve.log` has no `END` or a retrieve carries an error. The webhook and the person to tag live in `~/.claude/bowery-bank-downloads.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Brandy Sanders", "email": "bsanders@ocra-us.com"}}`.

Last, it starts the **Bowery Tripleseat Pay - After Bank Downloads** task, which splits the week's Tripleseat Pay deposits only when this download is complete (see `bowery-tripleseat-pay`).

## Report

A table of every account: retrieved (with `transactionsRetrieved` and `duplicatesFound`) or skipped (with its status). Name each skipped account's status, since `Password Needed` means the client must reconnect it under **Manage Bank Connections**. Flag an operating or payroll account that retrieves 0, since the CDs and savings are the accounts that usually do.

## First run

9/28/2026, week 9/20 to 9/27/2026. The dropdown held 19 accounts: the 13 cash accounts (`100-xx`) were Connected and retrieved, and the six credit cards (`202-xx`) were Not Connected and skipped. `100-10 - Cash - Cookshop Operating (4360)` retrieved 0 with its feed synced that day.
