---
name: cucina-colore-wkly-tips
description: Zero 25100 Employee Tips Payable in Cucina Colore Restaurant365 each week after payroll, setting the week's one Tips journal entry to the account's balance against 65650 Other Wages, then approving it. Use when asked to fill, balance, or approve the Cucina Colore Tips entry in R365, to check Cucina Colore Tips Payable, or when the Thursday scheduled run starts it.
---

# Weekly Tips entry into Cucina Colore

Tips reach 25100 Employee Tips Payable as credits on each day's sales entry (`NJ...`, comment `Tips Payable`) and leave as one debit on the week's `Payroll` entry. What remains once payroll is in moves to 65650 Other Wages on the week's `Tips` entry, so 25100 ends every Sunday at zero.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skill>/scripts/r365-login.sh cct
```

The login reads `~/.claude/cucina-colore-credentials.md`, the same login as `cucina-colore-weekly-cc-fees-accrual`. Ask the human only when it is missing or rejected. Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting beyond the scripts here.

## The week

Monday through Sunday, every entry dated **that Sunday**, one location, `10100 - Cucina Colore`. Payroll for the week is usually created and approved by Jamie Millard on the Wednesday after.

## Step 1: the entries

```bash
bash <skill>/scripts/find-entries.sh cct <Sunday yyyy-MM-dd>
```

It prints `{payroll:[...], tips:[...]}` for the Sunday, each with `status`, `amount` and `id`. Go on only when exactly one Payroll entry reads **Approved**. A recurring template (`Template: Tips`) creates the week's Tips entry **Approved at 0.01**. No Tips entry for the Sunday, or more than one, is a stop for the human.

## Step 2: the balance

```bash
bash <skill>/scripts/pull-report.sh cct gl 25100 <Monday M/D/YYYY> <Sunday M/D/YYYY> gl.csv
node <skill>/scripts/balance.js gl.csv <Sunday M/D/YYYY>
```

`pull-report.sh` needs a `/react/` page; when it reads `no GL Account Detail card`, `goto https://cucinacolore.restaurant365.com/react/accounting`, rerun the login and retry. `balance.js` prints, all credit-positive: `begBal` (25100 at the prior Sunday), `sales`, `payroll`, `tipsNow` (the Tips entry as it stands), `balance` (everything except the Tips entry), and `amount` and `side` to post. `hasPayroll` must read true.

The entry clears the **whole** `balance`, so 25100 is zero at the Sunday. A `begBal` other than zero means a prior week was left open; it still clears into this week, and is named to the human with the week it came from. W.E. 10/11/2026 was one: the Tips entry credited 671.16 before the 10/10 sales entry (NJ00005953) was reposted, leaving 1,958.31. It was corrected on 10/20/2026 to Dr 25100 1,287.15.

## Step 3: posting

```bash
bash <skill>/scripts/post-entry.sh cct <Tips TransactionId> <amount> <side>
```

The entry is always unapproved first, then updated, saved, and approved and closed. The script opens the entry by its direct url, unapproves it, sets both lines through the Kendo model, saves through the ribbon's Save item, approves through **Approve and Close**, then reloads and reads back, printing `OK` or `MISMATCH`. A `credit` balance, the usual case, posts:

```
debit   25100 - Employee Tips Payable   amount
credit  65650 - Other Wages             amount
```

A `debit` balance reverses both sides and is named to the human.

## Step 4: verify

Rerun Step 2 into `after.csv`. Done means `endBal` reads 0.00 and `find-entries.sh` shows the Sunday's Tips entry Approved at `amount`.

## Unattended run

`scripts/thursday-run.ps1` runs from Task Scheduler Thursdays hourly 10:00 to 18:00 and Friday 10:00, first 10/22/2026 (`scripts/register-task.ps1` sets it up, only while signed in). It starts this skill headless with a prompt beginning `Unattended run`, naming the week, the Sunday and the work directory. A `waiting` result leaves the week open for the next start; Friday's posts a waiting card. Any other result writes `done.txt` and posts the card. `-Force` reruns a week, `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Never ask. Use session `cctu`, every command from the repo root, and pass the work directory as an absolute path for every output file.
- A rejected login is `failed`, reason in `note`.
- Payroll missing or Unapproved is `waiting`, posted nothing.
- No Tips entry, or more than one, is `missing`. A `balance.js` STOP or `hasPayroll` false is `failed`.
- A Tips entry already Approved at `amount` on `side` with `endBal` 0.00 is `skipped`.
- Otherwise run `post-entry.sh`, then Step 4. `OK` with `endBal` 0.00 is `approved`; anything else is `failed`, the failing step in `warnings`.
- Warn on a `begBal` other than zero, a `debit` side, and an `amount` over 3,000.00. Each still posts.

Close `cctu`, then write `result.json` in the work directory:

```json
{ "start": "10/12/2026", "end": "10/18/2026", "status": "approved", "begBal": 1958.31, "sales": 11704.68, "payroll": -10000.00, "balance": 3662.99, "side": "credit", "amount": 3662.99, "balanceAfter": 0, "transactionId": "...", "warnings": [], "note": "" }
```

The wrapper posts it through `scripts/notify-teams.ps1` to the Payroll channel, tagging Lindsay, and reports a failure when the file is missing. The webhook lives in `~/.claude/cucina-colore-tips.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Lindsay Bauknecht", "email": "lindsay@ocra-us.com"}, "mentionWhen": "always"}`. `notify-teams.ps1 -DryRun` prints the card without posting.
