---
name: cucina-colore-weekly-cc-fees-accrual
description: Post the weekly credit card fee accrual into Cucina Colore Restaurant365, setting the week's one Credit Card Fees journal entry to 1.5% of the week's Total Sales, then approving it. Use when asked to fill, balance, or approve the Cucina Colore Credit Card Fees entry in R365, or to check a week's accrual against sales, or when the Tuesday scheduled run starts it.
---

# Weekly CC fee accrual into the Cucina Colore journal entry

Cucina Colore accrues **1.5% of its Total Sales** for the week. Read the week's sales from the GL Account Detail on every revenue account, compute the accrual, then set it on the week's one `Credit Card Fees` entry. This follows the NORMS CC fee accrual (`../norms-weekly-cc-fees-accrual/SKILL.md`), with one store, a different week, and an entry that is always unapproved before it is filled.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skill>/scripts/r365-login.sh ccc
```

The login reads `~/.claude/cucina-colore-credentials.md` (Lindsay's login, `cucinacolore.restaurant365.com`). Ask the human only when it is missing or rejected.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting beyond the scripts here. It carries the frame walk, the soft navigation, the ribbon menus, and the save and approve checks they lean on.

## The week

The week runs **Monday through Sunday**, and the entry is dated **that Sunday**. A run on Tuesday 10/20/2026 posts 10/12 through 10/18/2026 to the entry dated 10/18/2026. Every location is the one store, `10100 - Cucina Colore`.

## Step 1: Total Sales

```bash
bash <skill>/scripts/sales.sh ccc <Monday M/D/YYYY> <Sunday M/D/YYYY> <workdir>
```

It opens the GL Account Detail for the Revenue account type over the week with Show Unapproved on, and prints `netSales` (revenue credits less the discount debits, the P&L's `Total Sales` row), `accrual`, and `foodDays`, the count of days with a 42000 Food Sales line. The accrual is `Math.round(net * 1.5) / 100`, half up to the cent.

**`foodDays` must read 7** before posting. A short count means a day's sales have not landed. The same figure shows on the **Week vs Prior** view of the Profit and Loss card (Total Sales row, rounded to whole dollars); that view's saved As Of is a fixed 2023 week, so click `Previous` before running it.

The script's url carries the drill-down the Week vs Prior P&L hands out. If it stops rendering, run that view, take the `Total Sales` link's `/url` from the report snapshot, and update the script.

Posted history before 10/18/2026 does not tie to this rule except 9/20/2026 (57,379.12 sales, 860.69). The other weeks from 8/30 ran 0.7% to 89% off it, so do not use them as a check of the method.

## Step 2: the entry

```bash
bash <skill>/scripts/find-entries.sh ccc
```

It lists every `Credit Card Fees` entry, newest first, from the All Transactions grid's server data. The week's entry already exists, created **Approved at 0.01** with comment `1.5% of sales`. It holds two lines:

```
debit   91000 - Credit Card Fees    accrual
credit  20500 - Accrued Expenses    accrual
```

If the Sunday has no entry, stop and report it rather than building one.

## Step 3: posting

```bash
bash <skill>/scripts/post-entry.sh ccc <TransactionId> <accrual>
```

It opens the entry by its direct url, unapproves it (`Transaction/UnApprove` reads `unapproved successfully`), sets both lines through the Kendo model, saves through the ribbon's Save item, then approves through **Approve and Close** (`Transaction/Approve` reads `Successfully Approved.`). It reloads and reads both lines and the ribbon back, then prints `OK` or `MISMATCH`. An entry already Unapproved skips the unapprove. A `goto` to the same url leaves the stale page, so the read-back reloads.

On 10/20/2026 this posted 953.69 to the 10/18/2026 entry in about a minute.

Confirm on the grid afterwards: `find-entries.sh` shows the Sunday Approved at the accrual.

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 10:00, first on 10/27/2026 (`scripts/register-task.ps1` sets it up). It starts this skill headless with a prompt beginning `Unattended run`, naming the week, the prior week, and the work directory, writes `done.txt`, and posts the result to Teams. `-Force` reruns a week, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Never ask. Use session `cccu`, every command from the repo root. Bash resets its directory between calls, so pass the work directory as an absolute path.
- A rejected login fails the run: write `result.json` with status `failed` and the reason in `note`, and post nothing.
- Run `sales.sh` for the week and for the prior week. `foodDays` under 7 makes the week `held`, posted nothing. Net sales more than 10% below the prior week's is a warning only.
- No entry for the Sunday is `missing`. One already Approved at the accrual is `skipped`. Otherwise run `post-entry.sh`; `OK` is `approved`, anything else is `failed` with the failing step in `warnings`.

Close `cccu`, then write `result.json` in the work directory:

```json
{ "start": "10/12/2026", "end": "10/18/2026", "status": "approved", "netSales": 63579.38, "accrual": 953.69, "amount": 953.69, "priorNetSales": 60099.12, "transactionId": "...", "warnings": [], "note": "" }
```

`amount` is what the grid shows posted. The wrapper posts the card through `scripts/notify-teams.ps1` to the Cucina Colore Wkly Journal Entries channel, and reports a failure when the file is missing. The webhook lives in `~/.claude/cucina-colore-cc-fees-accrual.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Lindsay Bauknecht", "email": "lindsay@ocra-us.com"}, "mentionWhen": "always"}`. With `mentionWhen` set to `attention`, Lindsay is tagged only when the entry is not approved.
