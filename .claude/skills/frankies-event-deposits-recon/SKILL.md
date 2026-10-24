---
name: frankies-event-deposits-recon
description: Reconcile Frankies 457's event deposits and Tripleseat receivable in Frankie's Spuntino Restaurant365, week by week, keeping that week's tab of the Event Deposits & Tripleseat Receivable workbook tied to the GL and recoding Tripleseat event entries or bank deposits that book a payment to the wrong account. Use when asked to run the Frankies event deposit recon, update the Frankies 457 event deposits spreadsheet, or fix Frankies 2015 Event Deposits or 1242 Tripleseat Receivable, or when the Thursday scheduled run starts it.
---

# Frankies 457 event deposit recon

Three records have to agree for every day:

- the GL: **2015 Event Deposits** (a credit balance) and **1242 Tripleseat Receivable**, location 1000 - Frankies 457;
- the week's tab of the workbook, whose deposit total (`D`) must equal the GL 2015 balance and whose receivable total (`I`) must equal the GL 1242 balance on the same date;
- the entries behind them: Tripleseat **event entries** and **bank deposits**.

**Event entries** are journal entries numbered `Events - <event>`, one per Tripleseat invoice, dated on the event date. The Tripleseat sync posts them, sales and tax included. Each applied deposit is a 2015 debit commented `Deposit MM/DD/YY : <method>`. The balance due and any tip go on 1242.

**Bank deposits** are the Stripe payouts, wires and remote deposits. Each line is commented `M/D/YY: <event>`, and that date is the event date. A 2015 credit is a new deposit; a 1242 credit pays a receivable. Stripe fees sit on 6205 and are outside the recon.

## The coding rule

A payment is a **deposit** (2015) only when its cash reached the bank on or before the event date. From the event date until the payout lands, the amount sits on **1242** until paid. Tripleseat ignores this: it calls any payment taken before the event a deposit, even when the card payout lands after the event. Recode whichever side breaks the rule:

| Found | Recode |
|---|---|
| event entry 2015 line whose payout landed after the event, or has not landed | event entry line to 1242 (the payout then clears it) |
| bank deposit 2015 line paid after its event | bank deposit line to 1242, with the event as its comment |
| bank deposit 1242 line paid on or before its event | bank deposit line to 2015 |

```bash
bash <scripts>/move-line.sh fk je <entry id> "2015 - Event Deposits" debit 22905.49 "Deposit 07/08/26 : Credit Card 2631 Mastercard" "1242 - Tripleseat Receivable"
bash <scripts>/move-line.sh fk bd <entry id> "2015 - Event Deposits" credit 25379.15 "" "1242 - Tripleseat Receivable" "8/28/26: Meredith & Paul Wedding"
```

It opens the entry (the Adjustments tab for a bank deposit), clicks Edit, re-accounts the one line matching account, side, amount and comment, sets the optional new comment, reads the line back, then **Edit Complete** and **Save and Close**. The entry stays Approved. It prints `SAVED <id>` only when the server copy carries the moved line, else `FAIL:`. Recheck with `entries.sh`. A `grid did not load` failure means R365 dropped to its login page: rerun `r365-login.sh` and retry once.

## Tips and post-event payments

A payment that lands after its event, once the balance is fully paid, is a tip. Raise the event entry's 1242 Tip line and its 2200 Gratuity line by the payment, and recode the bank deposit line to 1242 if it sits on 2015. A tip receivable more than 30 days past its event with no payment comes off: both lines to zero. `set-tip.sh` sets both lines and rereads the entry, so a closed period prints `FAIL` instead of `SAVED`:

```bash
bash <scripts>/set-tip.sh fk <entry id> "Tip" 1260 1260
```

2025 is closed. A 2025 tip comes off through one journal entry in the open period: debit 2200 Tips Payable, credit 1242 one line per event, commented `M/D/YY: <event> TIP` (`Tip Write-Off - 2025 Events`, 9/30/26, is the model).

## Tripleseat

Look an event up in Tripleseat when R365 cannot place a payment: an uncommented deposit, a deposit with no event entry, a payment for an unknown event. `https://frankies.tripleseat.com`, login in `~/.claude/frankies-credentials.md`; after the password Tripleseat texts a 6-digit passcode that the human enters. Search from the dashboard, open the event, then its **Payments** tab: each payment shows its date, method and id. A Blackbird payment id equals the `Inv` id in the Bill.com memo of the R365 bank deposit. A postponed event keeps its deposit; comment the deposit with the new event date.

## Setup

R365 is `https://frankiesspuntino.restaurant365.com`, on the same login as dLena (`~/.claude/bowery-credentials.md`). Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for playwright-cli habits. Work in one scratch directory for the whole run; the scripts write their files there. `<scripts>` is this skill's `scripts/` folder.

```bash
bash <scripts>/r365-login.sh fk
```

The workbook is `c:\Users\trici\OCRA\Frankies Spuntino Group - General\Reports\2026 Frankies 457 Event Deposits & Tripleseat Receivable - Recon.xlsx`. `Reports\Year End` holds kept copies only (see Month-end close); never write to them. The `Reports` file without `- Recon` is a stale 10/4 file. Tabs run newest first, one per week, named for the week's Sunday (`09.27`), plus a month-end tab when the month ends midweek (`07.31`, then `08.02` for 8/1 to 8/2). A week runs Monday to Sunday.

A tab has two lists over rows 5 to the `Total` row:

- deposits in `A:D`: paid date, event date (or `TBD`), name, amount;
- the receivable in `G:I`: event date, name, amount. It starts on the row after the last deposit.

A row cleared during the week keeps its place with its amount moved to `E` (deposits) or `J` (receivable), which keeps it out of the totals. The next week's tab drops it.

## Every run covers two weeks

Entries get backdated after a tab is written: on 10/24/2026 five bank deposits dated 10/5 to 10/9 had been added since the 10.11 tab was built. So every run first re-reconciles the prior week, then does the current week.

1. **Lookback.** Run Steps 1 to 3 for the prior week against the tab before it (for current week 10.18: the 10/5 to 10/11 range against `10.04`). `glbeg.txt` must equal that older tab's totals. Build the replay into the scratch copy as `<prior tab>r` (Step 4), then compare it with the tab already there:

   ```bash
   node <scripts>/diff-tabs.js dumpw.txt 10.11 dumpw.txt 10.11r
   ```

   `SAME` means nothing changed: drop the `r` tab. Otherwise the replay replaces the tab, and each `only` row goes in the report with the entry behind it:

   ```bash
   powershell.exe -NoProfile -File "$(cygpath -w <scripts>/drop-tab.ps1)" -File "$(cygpath -w "$PWD/work.xlsx")" -Name "10.11" -Rename "10.11r"
   ```

   Recodes from Step 2 apply to the lookback week too; a recode changes the GL, so rerun Step 1 after it.
2. **Current week.** Steps 1 to 4 from the refreshed prior tab, in the same `work.xlsx`. Move the lookback's `ops-*.json` aside first, since `plan.js` names them by day.

Copy `work.xlsx` over the workbook once, at the end, only when the workbook still matches the copy taken at the start (`cmp`). A changed workbook means someone edited it during the run: stop and report.

## Step 1: the GL and its entries

```bash
bash <scripts>/gl-balances.sh fk 9/21/2026 9/27/2026
bash <scripts>/entries.sh fk $(cut -d'|' -f3 glids.txt | sort -u) > /dev/null
```

`gl-balances.sh` runs GL Account Detail on the System View with exactly 1242 and 2015 ticked and `Show Comment/Location/#` on Full. It writes `glrows.json`, `glbal.txt`, `glids.txt` (ref, type, entry id) and `glbeg.txt` (the opening balances). `glbeg.txt` must equal the prior tab's `D` and `I` totals; stop and report if it differs. `entries.sh` reads every entry's lines through R365's API into `entries.json`; it takes a second per entry.

## Step 2: apply the coding rule

Before planning, check every 2015 line in the week's entries against the coding rule and recode what breaks it. A payout's date is its bank deposit date. A payment with no payout anywhere has not landed. Search every bank deposit line since the payment date, in every account, before concluding that. Then rerun Step 1.

## Step 3: plan the week

```bash
node <scripts>/xlsx-dump.js "<workbook>" > dump.txt
node <scripts>/plan.js dump.txt <prior tab> glrows.json entries.json 9/21/2026 9/27/2026
```

It replays the week's GL lines, day by day, against the prior tab, writes `ops-<M>-<D>.json` per day, and prints each day's tab totals against the GL as `TIES` or `OFF`, plus every `ISSUE`:

- a bank deposit 2015 credit adds a deposit row; one with no event date in its comment goes in as `TBD`;
- an event entry 2015 debit clears the deposit rows it applies, matched by amount and a shared name word, or by several rows summing to the line;
- an event entry 1242 debit adds a receivable row named for the event (`TIP` for a tip line);
- a bank deposit 1242 credit clears the receivable rows it pays. A payment short of its one matching row clears that row and carries the remainder as `<name> - short paid`;
- anything it cannot match goes in as an `UNMATCHED ...` row at the signed amount, so the tab still ties, and prints as an `ISSUE`.

Every day must print `TIES`. An `OFF` day means a line was read wrong; fix the plan before writing the tab.

## Step 4: write the week's tab

Edit only a scratch copy, since the workbook sits in a synced OneDrive folder where AutoSave can land a half-applied edit. Copy the prior tab to the week's name, then apply one op list: `{"op":"purge"}` followed by the week's daily ops in date order.

```bash
cp "<workbook>" work.xlsx
powershell.exe -NoProfile -File "$(cygpath -w <scripts>/new-week-tab.ps1)" -File "$(cygpath -w "$PWD/work.xlsx")" -From "09.20" -Name "09.27"
powershell.exe -NoProfile -File "$(cygpath -w <scripts>/sheet.ps1)" -File "$(cygpath -w "$PWD/work.xlsx")" -Sheet "09.27" -Ops "$(cygpath -w wk.json)"
```

`sheet.ps1` prints the D and I totals; they must equal the GL on the week's last day. Copy `work.xlsx` over the workbook and keep `after-<MMDD>.xlsx` for rollback.

## Step 5: report

```bash
node <scripts>/xlsx-dump.js "<workbook>" > dump.txt
node <scripts>/open-items.js dump.txt 09.27 9/27/2026
```

Report the week's GL balances against the tab, every recode made, every `ISSUE`, and what `open-items.js` lists: deposits whose event has passed (an event entry is missing, or the deposit was booked twice), `TBD` and negative deposits, and open receivables. Then close the browser: `playwright-cli -s=fk close`.

## Month-end close

A week that crosses a month end gets its month-end tab first (through the month's last day, e.g. `10.31`), then the Sunday tab from it (`11.01` for 11/1). Once the human says the month is done, copy the workbook to `Reports\Year End\2026 Frankies 457 Event Deposits & Tripleseat Receivable - Recon - <Mon> 2026 Close.xlsx` (`Sept 2026 Close` is the model). The live workbook stays in `Reports`.

## Unattended run

`scripts/thursday-run.ps1` runs from Task Scheduler on Thursdays at 15:00 (`scripts/register-task.ps1` sets it up). It starts this skill headless with a prompt beginning `Unattended run`, naming the lookback week, the current week (the Monday to Sunday week that ended the Sunday before), their tabs and the work directory.

No human answers during the run, so:

- Never ask. `cd` into the work directory once, before opening any session, and run every command from there. Use session `fku` for R365, so an interactive run's `fk` session is left alone.
- Tripleseat needs a texted passcode, so skip it. A payment R365 cannot place stays an `UNMATCHED` row (the tab still ties) and goes in `issues`.
- Apply the coding rule's recodes (authorized) and list each in `recodes`. Never set or zero tips, never write off, never edit an event entry beyond the coding rule; put what needs one in `issues`.
- A week that crosses a month end writes both tabs (Month-end close). Never make the Close copy; add `"<Mon> month-end tab written; Close copy waits for review"` to `openItems`.
- A day that prints `OFF`, a `glbeg.txt` that differs from the tab before, or a workbook changed during the run: write no tab, set that week's `status` to `failed` with the reason in `note`.

Close `fku` by name, then write `result.json` in the work directory. The wrapper posts it to the Event Sales Entry Teams channel through `scripts/notify-teams.ps1`:

```json
{ "weeks": [
    { "weekEnding": "10/11/2026", "status": "rebuilt", "tab2015": 896324.38, "tab1242": 86078.86, "gl2015": 896324.38, "gl1242": 86078.86,
      "changes": ["BD005076 10/7 40,000.00 Jimmy Kimmel Live Wrap paid 1242, added after the tab"] },
    { "weekEnding": "10/18/2026", "status": "ties", "tab2015": 860364.26, "tab1242": 155397.40, "gl2015": 860364.26, "gl1242": 155397.40, "changes": [] } ],
  "recodes": ["BD005080 19,779.87 Sophia & Alex 1242 -> 2015"], "issues": [], "openItems": ["Jose Ginarte 1,153.74 deposit, event 10/17 passed, no event entry"], "note": "" }
```

`status` is `unchanged` (lookback `SAME`), `rebuilt` (lookback replaced), `ties` (current week written) or `failed`. `openItems` holds `open-items.js` lines worth a look: passed-event deposits, short pays, receivables over 30 days. The webhook lives in `~/.claude/frankies-event-deposits.json`, outside the repo: `{"teamsWebhook", "mention": {"name","email"}, "mentionWhen": "always"|"attention"}`. It tags Collin Heyerdahl every week. `notify-teams.ps1 -DryRun` prints the card without posting. `done.txt` in the work directory marks a reported week; `-Force` reruns it and `-Date yyyy-MM-dd` stands in for today.

## Rulings

- A payment held between the event and the payout belongs on 1242 (2026-10-04).
- `BlackBird Pizza Series` payments go with the BlackBird Pizza deposits, as `TBD` deposit rows (2026-10-04).
- The human authorized editing approved event entries and bank deposits to apply the coding rule (2026-10-04).
- Payments after a fully paid event are tips (2026-10-14).
- A cash tip on an event entry's 1242 Tip line stays: the cash is deposited later and clears it (2026-10-15).
- Unpaid tips more than 30 days past the event are removed (2026-10-14).
- Blackbird Labs does not invoice. Its Bill.com payments against monthly invoice numbers (`Inv 07.2026.1`, `Inv 08.2026`) are BlackBird Pizza Series deposits: 2015, commented `TBD: BlackBird Pizza Series` (2026-10-14).
- A deposit and a receivable of the same amount for one event mean the event entry booked a paid deposit to 1242. Recode that event entry line to 2015 (2026-10-14).

## Rebuilding tabs

When fixes reach back into weeks already written, rebuild from the last tab the fixes leave untouched. Delete the later tabs in `work.xlsx`, then run Steps 1, 3 and 4 week by week. The first rebuilt week starts with `rm` ops for the rows the fixes cleared, so its opening totals equal the GL. Done 2026-10-14 from 06.30: every day 7/1 to 9/27 tied, 9/27 closing at 2015 995,651.05 and 1242 86,467.56.

## First run

2026-10-04, 7/1 to 9/27 from the human's 06.30 tab, which tied to the GL (2015 1,223,025.82, 1242 111,143.92). The coding rule recoded 17 event entry lines to 1242 and five bank deposit lines (Nicole Chen and Simpson Thacher to 2015, Meredith & Paul and Leah & Eli 9/1 payouts to 1242, BlackBird Pizza Series to 2015). Every day tied; 9/27 closed at 2015 981,961.64 and 1242 161,392.45. Open at the end: no event entry for the 9/11 Ben & Todd / Welcome Back Ben & Christopher event (deposit 17,719.41, payments 27,752.86), extra payments after the balance (Andrea & Oliver 1,260.00, Stephanie & Will 1,500.00, Jennifer & Scott 2,500.00, Alex & Barbara 3,300.00), Angel & Neha paid 497.67 short, Virginia Gresham's 1,417.55 deposit coded to 1201 Blackbird Receivable (BD004848), and two uncommented transfers (BD004575 29,806.01 on 2015, BD004891 29,497.95 on 1242). Rows carried from before 6/30 still pair a deposit with a receivable of the same amount (Neil & Jenny, Grace & Spencer, Jelena & Paul, Glenda Hersh, Gary Sinise).
