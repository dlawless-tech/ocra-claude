---
name: danny-coops-bank-downloads
description: Retrieve the prior week's bank activity into Danny & Coop's Restaurant365 for every connected account on the Bank Activity page. Use when asked to download, pull, or retrieve Danny & Coops bank activity or bank feeds in R365, or to refresh a Danny & Coops account's transactions for a week.
---

# Weekly bank activity retrieve for Danny & Coops

Bank Activity pulls each account's transactions from its bank connection into the Unmatched grid, where the `ocra-r365:r365-bank-activity` skill codes them. This skill does only the pull: every account on the dropdown, in list order, retrieved over a custom date range. An account whose connection is not `Connected` is skipped.

The page and its scripts are the same as Bowery's; [`../bowery-bank-downloads/SKILL.md`](../bowery-bank-downloads/SKILL.md) holds the page's quirks (the "already refreshed today" warning, the status blocks, the selectors). Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for playwright-cli habits. Browser sessions are shared across the whole repo, so this skill uses its own session name, `dcbd`; another skill using the same name would drive the same browser:

```bash
bash <skills>/danny-coops-payroll/scripts/r365-login.sh dcbd
```

## The week

Sunday to Sunday: the most recent Sunday on or before today back to the Sunday before it, both dates inclusive. The Sunday 10/11/2026 run takes `10/4/2026` to `10/11/2026`, and a Monday 9/28/2026 run takes `9/20/2026` to `9/27/2026`. The shared Sunday comes back as `duplicatesFound`, not as new rows.

`0 new, 0 duplicates` on Operating can mean the week is already in R365 and matched, since matched rows are not counted as duplicates. Read the grid before calling the feed broken: the `ServiceStack/BankActivity` response lists the `matched` rows with their dates.

## Step 1: open Bank Activity

The home dashboard's nav renders with no links for this login, so the Bowery side-menu walk fails. Go to the form URL directly:

```bash
bash <skill>/scripts/open-bank-activity.sh dcbd
```

It loads `https://dannyandcoops.restaurant365.com/#/form/BankActivityForm/00000000-0000-0000-0000-000000000000` in the current tab and waits for the account dropdown. If the goto drops the session, it logs back in and tries once more. It prints `bank activity open` or `FAIL:`.

## Step 2: retrieve every account

```bash
bash <skill>/scripts/retrieve-all.sh dcbd 9/20/2026 9/27/2026
```

For each account it opens the `Select Checking Account` dropdown, picks the next option, answers **No** to the warning, reads the connection status, and for a `Connected` account sets Start and End through the pen/paper icon, reads both back, and clicks the dialog's Retrieve Activity. It closes the Pendo marketing guide and the Yodlee "Linked Accounts" dialog when either covers the page, since both block clicks; the dialog opens when R365 refreshes a stale Chase connection. It appends one line per account to `retrieve.log`:

- `RETRIEVED: <account> {"transactionsRetrieved":N,"duplicatesFound":N,"error":null,"result":1}`, the server's answer to `RetrieveBankActivityForGlAccount`.
- `SKIPPED: <account> (<status>)` for `Not Connected` or `Password Needed`.
- `END` after the last account.
- `FAIL:` names the account and the step. It stops there; rerun from that account with a fourth argument, its 1-based list position.

`retrieve-account.sh dcbd <n> <start> <end>` runs one account alone.

The step is done when `retrieve.log` ends on `END` and every `RETRIEVED` line carries `"error":null` and `"result":1`.

## The accounts

The dropdown holds two, in this order:

1. `10001 - Danny & Coops Operating 1563`, the operating account payroll pays from.
2. `10200 - Danny & Coops Savings 0006`.

A third account on the list is new; retrieve it like the others and name it in the report.

## Report

A table of every account: retrieved (with `transactionsRetrieved` and `duplicatesFound`) or skipped (with its status). Name each skipped account's status, since `Password Needed` means the client must reconnect it under **Manage Bank Connections**. Flag the operating account if it retrieves 0, since it carries every payroll and deposit.

## Unattended run

`scripts/sunday-run.ps1` runs from Task Scheduler on Sundays at 6:30 (`scripts/register-task.ps1` sets it up). It logs in as session `dbk`, retrieves every account for last Sunday through today, and logs back in to resume from a `FAIL` up to three times. It writes `started.txt` so a week runs once: `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today. The work directory is `.scratch/danny-coops-bank-downloads/wk<MMdd>`.

`scripts/notify-teams.ps1` posts the result to the Bank Activity channel through the webhook in `~/.claude/danny-coops-bank-downloads.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Layla Ebersole", "email": "layla@ocra-us.com"}}`. Layla is tagged only on a problem: a run that never reaches `END`, a server error, a skipped account, or Operating at 0 new.

## First run

9/29/2026, week 9/20 to 9/27/2026. Both accounts were Connected and retrieved: Operating 1563 took 36 transactions, Savings 0006 took 0. The direct URL opened Bank Activity on the first goto.
