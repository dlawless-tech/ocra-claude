---
name: dlena-weekly-event-deposit-recon
description: Reconcile one week of dLena's event deposits in Restaurant365, day by day, keeping that week's tab of the Banquet Deposits & Tripleseat Receivable workbook tied to the GL and splitting each Daily Sales Summary's banquet deposit lines by event with the event name as the comment, from the Toast event tickets. Use when asked to run the dLena weekly event deposit recon, update the dLena banquet deposits spreadsheet, or add event names to dLena DSS entries.
---

# dLena event deposit recon

Three records have to agree for every day of the month:

- the GL, read through the **Event Deposits** view of GL Account Detail (1218 Tripleseat Receivable, 2340 Prepaid Customer Orders, 2440 Banquet Deposits);
- the month tab of the workbook, whose Banquet Deposits total (column E) must equal the GL 2440 balance and whose Tripleseat Receivable total (column J) must equal the GL 1218 balance, on the same date;
- each Daily Sales Summary (DSS) journal entry, where the POS books one lump 2440 line per day that gets split into one line per event deposit, commented with the event name.

Toast is where a lump line turns into events: the day's event tickets show which deposits were applied.

A run covers one **week**, Monday to Sunday, in its own workbook tab. Inside it, work **one GL day at a time, in date order**. A day is done when the tab is saved and its totals equal the GL for that date; the week is done when Sunday ties. The first week of a month starts on the 1st, whatever the weekday.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for playwright-cli habits. Work in one scratch directory for the whole run, since `playwright-cli` binds sessions to it and the scripts write their files there. `<scripts>` below is this skill's `scripts/` folder.

## Setup

R365 is `https://unoatfifth.restaurant365.com`, on the Bowery credentials:

```bash
bash <scripts>/r365-login.sh dr
```

R365 drops the session every hour or so. Every script that needs it logs back in or fails naming the login; rerun it after `r365-login.sh`.

Toast runs in its own headed session. Open the sign-in page and have the human sign in to the window themselves; never type the Toast password, even one pasted in chat:

```bash
playwright-cli -s=ts open --headed https://www.toasttab.com/restaurants/admin/home
```

Toast lands on whichever restaurant the account used last. Switch with the restaurant picker in the header (`combobox "Toggle restaurant picker"`): fill its searchbox with `lena` and click `dLeña - search option`. The header then reads `dLeña`.

The workbook is `c:\Users\trici\OCRA\dLena - General\Reports\<MM>'26 dLena Banquet Deposits & Tripleseat Receivable.xlsx`. Tabs run newest first: the month tab (`Sept'26`), then one tab per week named for its Sunday (`9.13`), then the prior month.

## Step 0: the week's tab

Start the week by copying the tab that tied through the prior Sunday into a new tab named for this week's Sunday, placed right before it so the newest week sits next to the month tab:

```bash
cp "<workbook>" work.xlsx
powershell.exe -NoProfile -File "$(cygpath -w <scripts>/new-week-tab.ps1)" -File "$(cygpath -w "$PWD/work.xlsx")" -From "9.13" -Name "9.20"
```

Diff the two tabs with `xlsx-dump.js` (they must match), then save the workbook as in Step 4. All of the week's changes go into the new tab. Its opening totals equal the GL balances at the prior Sunday (the GL's `Beg Balance` for the first week of a month); stop and report if they differ.

## Step 1: the GL for the week

```bash
bash <scripts>/gl-balances.sh dr 9/7/2026 9/13/2026
```

It runs the Event Deposits view for the range (start the first week of a month on the 1st) and writes `glrows.json` (every line with its running balance), `glbal.txt` (each account's closing balance per day) and `glids.txt` (each ref number's entry id). Read the day's lines from `glrows.json`.

## Step 2: the day's bank deposits, into the workbook

Each Bank Deposit line carries a Stripe comment `M/D/YY <event>`; the date is the event date.

| GL line | Workbook |
|---|---|
| 2440 credit | add a Banquet Deposits row: collected = deposit date, event date and name from the comment, the amount |
| 2440 debit (a refund) | remove the matching deposit row |
| 1218 credit | remove the receivable row it pays, which a prior day added |
| a comment with no event date (a direct payment such as `Planned Parentho/TMATE ...`) | add the row with event date `TBD` and tell the human |

## Step 3: the day's DSS, split by event

A Journal Entry line with a blank comment on 2440 (and sometimes 2340) is a DSS lump. Map it to its DSS:

```bash
bash <scripts>/dss-of.sh dr <entry id from glids.txt>    # prints the DSS id
bash <scripts>/read-dss.sh dr <DSS id>                   # status and the 1218/2340/2440/8110 lines
```

Pull the day's Toast tickets. This is the Orders report for that single business day, each ticket's payments at its bottom:

```bash
bash <scripts>/toast-day.sh ts 20260904
```

It prints every ticket paid by `Deposit Applied`, `Event`, or `Chef's Table Experience Prepaid` (the OpenTable prepay). Read only `CAPTURED` payments; a `VOIDED` one was re-entered. Event tickets sit in the Events revenue center and are usually the day's largest; OpenTable tickets are small Dining Room tickets.

Match each ticket to the workbook's open deposits by **event date = DSS date** and amount, and build the lines:

- every deposit the workbook holds for that event comes off **2440**, one line per deposit row, at the row's amount, commented with the row's name;
- the rest of the ticket total goes to **1218** with the event name, and becomes a receivable row in the workbook (Stripe pays it later, as a 1218 credit);
- an event with no deposit dated that day puts its whole ticket on 1218.

**Late captures.** A 2340 credit on a DSS is a prior day's ticket whose Deposit Applied payments Toast captured today; the same amount sits inside today's 2440 lump. That part of the lump becomes a **2340 debit with a blank comment**, so 2340 nets to zero within the DSS. The late amount can sit in the DSS's 1218 line instead of, or as well as, the lump (IMEU on 9/16, 4,772.60 in the lump and 829.07 in 1218); re-amount the 1218 line down by that part, or, when the whole 1218 line is the late capture (LPL's 856.00 on 9/19), move it to 2340 with `dss-move-line.sh`.

**Unknown tickets.** A Deposit Applied or OpenTable payment with no matching deposit in the workbook goes to **1218**, commented `Unknown - Toast #<ticket>` (or `Unknown OpenTable - Toast #<ticket>`), and becomes a receivable row of that name. The human writes off whatever is left at month end.

**Discrepancies.** When a ticket's applied amount differs from what was collected for it, the difference goes to **8110 - Credit Card Fees**, as a debit or a credit, commented with the event name.

- **OpenTable** almost never matches (a 419.84 or 656.00 ticket against a 430.85 or 664.39 deposit). Book the full deposit off 2440 and the difference to 8110 without asking. When the lump holds more OpenTable deposits dated that day than Toast shows tickets, book every deposit the lump covers the same way. A payment that carries a tip (856.00 = 656.00 plus a 200.00 tip) books the tip as a **2330 - Tips Payable** debit, and only the rest of the difference goes to 8110.
- **Events.** Stop and show the human every other difference with the proposed 8110 line before posting it. Small ones are cents Toast adds (1,646.41 applied against 1,646.02 collected). A larger one can come from Stripe paying the receivable short: PWC's 3,289.70 receivable was paid 3,238.50, so the 1218 line became 3,238.50 and 8110 took the net overpayment, 58.18, keeping the lump whole. When Stripe pays a receivable short, change nothing: LPL's 856.00 was paid 808.00, and the workbook keeps an LPL Financial receivable of 48.00, written off at month end.
- **Voided payments.** Staff often void a ticket's payments and re-enter them on a later check of the same ticket, so a ticket can list VOIDED payments first and the CAPTURED ones further down (Charles on 9/11, #124). When the captured payments do not account for the lump, the day's Sales Summary settles it: its Payments table lists `Deposit applied` and `Chef's table experience prepaid` totals for the day, which sum to the DSS 2440 lump. Stop for the human only when they do not.

The DSS lines must sum to the lump. Write the plan and post it:

```json
{"dss":"<DSS id>","match":{"acct":"2440 - Banquet Deposits","debit":7020.05},
 "first":{"debit":863,"comment":"Kyanna's Birthday"},
 "add":[{"acct":"2440 - Banquet Deposits","debit":1646.02,"comment":"Kyanna's Birthday"},
        {"acct":"8110 - Credit Card Fees","debit":0.39,"comment":"Kyanna's Birthday"},
        {"acct":"2440 - Banquet Deposits","debit":430.85,"comment":"OpenTable"},
        {"acct":"8110 - Credit Card Fees","credit":11.01,"comment":"OpenTable"},
        {"acct":"2340 - Prepaid Customer Orders","debit":4090.80,"comment":""}]}
```

```bash
bash <scripts>/dss-edit.sh dr plan.json      # prints SAVED <id>, or FAIL: naming the step
bash <scripts>/read-dss.sh dr <DSS id>
```

A lump that already has its 1218 line (the POS books the Event payment there itself) needs only its comment: list it under `"notes":[{"acct":"1218 - Tripleseat Receivable","debit":3454.40,"comment":"Vanguard Networking Event"}]`. To change a saved line's amount, match any line as `match` and `first`, and re-amount others with `"amounts":[{"acct":"8110 - Credit Card Fees","side":"credit","from":109.38,"to":58.18,"comment":"PWC's Business Dinner"}]`; add `"was":""` to find a line by its current comment (a blank POS line) and give it the new one.

`dss-edit.sh` rewrites the lump line as `first`, comments each `notes` line, re-amounts each `amounts` line, adds each `add` line through the new-row form, checks the grid balances, then clicks **Edit Complete** and **Save and Close**. The DSS stays Approved; no unapprove is needed. A `FAIL:` leaves nothing saved; the next `goto` discards the open edit. To move one saved line to another account, use `dss-move-line.sh dr <DSS id> "<from acct>" <debit|credit> <amount> "<comment>" "<to acct>"`.

## Step 4: save the workbook for the day

Express the day's workbook changes as ops and apply them to a scratch copy:

```json
[{"op":"add","side":"dep","collected":"9/5/2026","event":"9/11/2026","name":"OpenTable","amt":664.39},
 {"op":"rm","side":"dep","name":"Emma's Birthday","amt":805,"event":"9/5/2026"},
 {"op":"add","side":"rec","event":"9/2/2026","name":"Rep Sewell Happy Hour","amt":2590.80},
 {"op":"rm","side":"rec","name":"Rep Sewell Happy Hour","amt":2590.80}]
```

```bash
cp "<workbook>" work.xlsx
node <scripts>/xlsx-dump.js work.xlsx > pre.txt
powershell.exe -NoProfile -File "$(cygpath -w <scripts>/sheet.ps1)" -File "$(cygpath -w "$PWD/work.xlsx")" -Sheet "9.13" -Ops "$(cygpath -w ops.json)"
node <scripts>/xlsx-dump.js work.xlsx > post.txt; diff pre.txt post.txt
```

`sheet.ps1` keeps each list sorted by event date, newest first (`TBD` on top, ties in their existing order), preserves formulas such as `=414.85+16`, inserts rows above the total when the list outgrows the blanks, and prints the E and J totals. Pass `event` on a remove whenever several rows share a name and amount, as OpenTable rows do. Check the diff shows only the day's changes and the totals equal the GL for the day, then copy `work.xlsx` over the workbook and keep a copy as `after-<MMDD>.xlsx` for rollback.

Edit only the scratch copy. The workbook lives in a synced OneDrive folder, and AutoSave writes an open file as it changes, so a half-applied edit can land in it.

## Verify

After posting the week's DSS edits, rerun `gl-balances.sh` for the week and compare `glbal.txt` with the tab's totals for every day. The week is done when each day's 2440 equals column E, 1218 equals column J, and 2340 nets to zero, through Sunday. Report a table of day, 2440, 1218, what changed on each DSS, and every discrepancy and `TBD` row.

## Toast quirks

- Toast answers bursts of report requests with a "server is currently too busy" alert, which blocks the session until dismissed. `toast-day.sh` dismisses it and waits. Drive the `ts` session from one command at a time; a second process on the same session changes the report date under the first and returns another day's tickets.
- A ticket can hold several checks, each with its own Payments table, and a check's payment can exceed the ticket total shown. On 9/12 the second OpenTable diner was a 419.84 payment on #240's second check, under a 181.38 ticket total. `toast-day.sh` reads every table; match on the payment amounts.
- Signed out, `toast-day.sh` prints `FAIL: Toast is signed out`; have the human sign in again, then rerun.
- The legacy report forgets its date after a reload and shows 0 entries; `toast-day.sh` always enters through the Sales Summary, which sets it.

## First run

9/29/2026, days 9/1 to 9/6, from the human's August DSS entries as the pattern. 9/2 split Rep Sewell Happy Hour (1,500.00 on 2440, 2,590.80 on 1218). 9/4 split Kyanna's Birthday and OpenTable, with Rep Sewell's late-captured 4,090.80 as a 2340 debit. 9/5 split Emma's Birthday and OpenTable. 9/6 split Abby's Birthday. The OpenTable and cents differences first went to 1218, and were moved to 8110 on the human's ruling. Every day tied: 2440 closed 9/6 at 121,977.64 and 1218 at 0.00. That first partial week was worked in `Sept'26`, then copied twice: to `9.6` as the week's record and to `9.13` for the week of 9/7 to 9/13.

Week of 9/7 to 9/13, in `9.13`: 9/9 PWC's Business Dinner (2440 1,875.00, 1218 3,238.50, 8110 credit 58.18), 9/10 Hellfire LLC, Vanguard Networking Event and OpenTable, 9/11 Charles' Birthday, Charle's Bachelor Party and two OpenTable, 9/12 Katelin Garcia's Bachelorette and two OpenTable. Every day tied; 2440 closed 9/12 at 107,456.41 and 1218 at 3,454.40 (Vanguard, paid by Stripe 9/15).

Week of 9/14 to 9/20, in `9.20`: 9/14 IMEU Policy Project Dinner, 9/15 LPL Financial and IHG Owners Assoc, 9/16 Planned Parenthood (both TBD deposits applied, 15,025.00 to 1218) with IMEU's late capture on 2340, 9/17 Angerholzer Broz Consulting, 9/18 OpenTable and an unknown 100.00 (#95), 9/19 Ashley Kucera's 40th Birthday, OpenTable and an unknown OpenTable 657.27 (#173) with LPL's 856.00 moved to 2340, 9/20 Nala's Birthday and Noni's 25th Birthday with Ashley's 1,338.97 on 2340. Every day tied; 2440 closed 9/20 at 96,166.21 and 1218 at 18,645.72.

Week of 9/21 to 9/27, in `9.27`: 9/21 Ashley's whole ticket re-booked late, the lump moved to 2340; Stripe paid `CLC Fireside Cafecitos` 15,525.00 against Planned Parenthood's 15,025.00, the 500.00 left as a -500.00 receivable. 9/22 Rosslyn Auto Body (no deposits, whole ticket to 1218). 9/23 PCG Business Dinner and Showtime Group - Lunch, Rosslyn's late capture on 2340. 9/24 the 9/23 tickets' late capture on 2340, and an OpenTable deposit Stripe coded to 1218, so the ticket went to 1218 at the deposit amount. 9/25 OpenTable, 9/26 Albert Portillo's Birthday, 9/27 Alasia's Birthday, Morristown Medical Center and Tiffany's 50th Birthday Party. A Stripe deposit can carry a credit and its own reversal (Columbia Southern, 1,750.00 twice and back once); add only the net rows. Every day tied; 2440 closed 9/27 at 111,213.76 and 1218 at 6,748.39.

Week of 9/28 to 9/30, in `9.30`: DSCC MRLC Reception's 9/28 payments were voided and recaptured on 9/30, so the 9/28 lump split to 2440 1,875.00 and 1218 4,420.74, and the 9/30 DSS put both recaptured parts on 2340. 9/30 had two OpenTable payments: 419.84 against a deposit Stripe coded to 1218, and 856.00 against 664.39 with the 200.00 tip on 2330. Stripe overpaid Morristown by 72.20, left as a -72.20 receivable. Every day tied; 2440 closed 9/30 at 126,712.84 and 1218 at 780.18. October's workbook is a copy of September's with `Oct'26` and `10.4` copied from `9.30` in front. Write the month label in B2 as text (`'October 2026`), since Excel turns it into a date otherwise.
