---
name: bowery-tripleseat-pay
description: Split Bowery Group's Tripleseat Pay payouts in Restaurant365, one Bank Deposit per payout for Rosie's, Vic's and Cookshop, into event deposit gross, card fees and refunds, with the payout page attached as a PDF. Use when asked to run the weekly Bowery Tripleseat Pay deposits, to correct a Bowery Paysafe deposit, or to check one against its Tripleseat payout, or when the Sunday bank downloads run starts it.
---

# Tripleseat Pay payouts into Bowery Bank Deposits

Tripleseat Pay (Paysafe) pays each store's event deposits to its operating account. Each payout reaches R365 as a Bank Deposit matched to the bank line, at location `500 - Rosie's`, `700 - Vic's` or `200 - Cookshop`, with "Paysafe" in its comment (`Refunds from Paysafe` or `Orig CO Name:Paysafe Merchant...`). It arrives booked as one net line to 253-00. This skill splits it from the payout's Transaction Summary and attaches the payout page.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365 beyond these scripts. Work in one scratch directory for the whole run, since `playwright-cli` binds sessions to it; payout PDFs land in its `pdf/<store>/`.

## Step 1: log in

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh bts
bash <skill>/scripts/tsp-login.sh tsp
```

Both print `authenticated`. The portal is `https://partypay.paymentsonline.io`; its credentials sit under **Tripleseat Pay** in `~/.claude/bowery-credentials.md`. Re-run a login whenever a script reports the other host.

## Step 2: pair deposits with payouts

For each store (`rosies`, `vics`, `cookshop`), with `<start>` 14 days before today:

```bash
bash <skill>/scripts/find-deposits.sh bts <store> <start> <today>
bash <skill>/scripts/list-payouts.sh tsp <store> <start minus 7 days>
```

Each deposit pairs with the payout of the same net amount dated up to 7 days before it; the bank posts a payout one to five business days after its payout date. Where several payouts share an amount (194.45 is common), pair oldest payout to oldest deposit. Pairing is done when every deposit has its payout.

- A payout with no deposit has not reached R365 yet. Leave it for next week's run and list it in the report, unless it was paid out in a month that is closing; then ask the human whether to post it ahead (see **Month end: post a payout ahead**).
- A deposit with no payout: stop and show it to the human.

## Step 3: post each pair

```bash
bash <skill>/scripts/post-payout.sh bts tsp <store> <po_id> <deposit TransactionId> "<pdf name>"
```

It reads the payout's gross, refunds and net, prints the payout page to a one-page PDF, opens the deposit, checks its total equals the payout net, and edits the Adjustments tab (**Edit**, change the 253-00 amount in place, add lines through the new-row form, **Edit Complete**, which saves and keeps the deposit Approved). It attaches the PDF through **Upload File**, then reloads the deposit. The pair is done when it prints `MATCH BD000xxx <net>`. A deposit already split prints `lines already right` and skips the upload when a Tripleseat PDF is attached, so reruns are safe. Each `FAIL` says whether anything was saved; one that was not leaves the deposit as it was.

Name the PDF `<Store> <M.DD> Tripleseat.pdf` from the deposit date (`Rosie's 9.11 Tripleseat.pdf`, `Vic's 9.01 Tripleseat.pdf`, `Cookshop 8.31 Tripleseat.pdf`); a second and third deposit on one date add ` (2)` and ` (3)` before `.pdf`.

## Step 4: report and close

Report a table per store: deposit, date, 253-00 credit, 632-00 debit, 401-27 debit, net, and what changed. List the payouts left for next week. Then close both sessions by name:

```bash
playwright-cli -s=bts close
playwright-cli -s=tsp close
```

## Unattended run

The **Bowery Tripleseat Pay - After Bank Downloads** task runs `scripts/tripleseat-run.ps1` (`scripts/register-task.ps1` sets it up, only while signed in). It has no schedule: the Bowery bank downloads Sunday run starts it after posting its own card. Its trigger is the completed bank download: it posts nothing until `.scratch/bowery-bank-downloads/wk<MMDD>/retrieve.log` for last Sunday ends on `END` with every retrieve at `"error":null,"result":1`. A failed download leaves the week alone; once the download is rerun and complete, start the task by hand.

The wrapper works in `.scratch/bowery-tripleseat/wk<MMDD>`, starts this skill headless with a prompt beginning `Unattended run` naming the work directory, week ending, and today, and writes `done.txt` so each week runs once. `-Force` reruns and skips the trigger; `-WeekEnding <yyyy-MM-dd>` names another week.

No human answers during the run, so:

- Never ask. Use sessions `btsu` for R365 and `tspu` for Tripleseat Pay, and run every command as `cd <work directory> && ...`.
- A deposit with no payout posts nothing; name it in `warnings`.
- A payout with no deposit goes in `pending`. One paid out in a month that has closed or is closing also goes in `warnings` as `month end: post ahead by hand`. Never post ahead.
- A `FAIL` from `post-payout.sh` is retried once after logging in again; a second `FAIL` goes in `warnings` with what it says was saved.

Close both sessions (Step 4), then write `result.json` in the work directory. The wrapper posts it to the Bank Activity Teams channel through `scripts/notify-teams.ps1`, with Brandy Sanders tagged on every card, and reports a failure when the file is missing:

```json
{ "weekEnding": "10/11/2026", "status": "complete",
  "deposits": [{ "store": "Vic's", "number": "BD000401", "date": "10/6/2026", "gross": 2000.00, "fees": 58.30, "refunds": 0.00, "net": 1941.70, "status": "matched" }],
  "pending": ["Rosie's po_xxx 10/9/2026 194.45"], "warnings": [], "note": "" }
```

Each deposit's `status` is `matched` (split this run), `already` (`lines already right`) or `failed`. `status` is `complete` when every deposit is `matched` or `already`, `partial` when some failed, and `failed` when the run could not log in or pair. A week with no Paysafe deposits is `complete` with an empty `deposits`. The webhook lives in `~/.claude/bowery-tripleseat.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Brandy Sanders", "email": "<work email>"}}`, the same channel as the bank downloads card.

## Month end: post a payout ahead

A payout dated in a closing month whose bank line lands in the next month is posted ahead as a standalone deposit dated the payout date. It stays outstanding until bank activity downloads, and R365 matches the bank line to it automatically. The 9/29/2026 Vic's payout went in this way as BD000397.

1. Open a blank form at `https://bowerygroup.restaurant365.com/#/form/BankDepositForm/00000000-0000-0000-0000-000000000000`. It opens on `800 - Bowery Group Corp`, and its Checking Account list holds only that location's accounts, so set the location first, then the account (`100-05` Rosie's, `100-08` Vic's, `100-10` Cookshop).
2. Set every dropdown through its Kendo widget, since a click on these inputs often misses and the typed text then lands in whichever field holds focus. The widget sits beside the visible input:
   ```js
   const w = jQuery('[name=bankDepositLocation_input]:visible').closest('.k-widget').find('[data-role=combobox]').data('kendoComboBox');
   w.dataSource.filter({field: w.options.dataTextField, operator: 'contains', value: '700'});
   // after the read: w.value(<matching item>[w.options.dataValueField]); w.trigger('change');
   ```
   The Adjustments new-row account picker is the same widget behind `input[placeholder="Select Account"]`, with `label` as its text field.
3. `fill` then `press Tab` on `#bankDepositDate` and `#bankDepositComment` (`Refunds from Paysafe`, so `find-deposits.sh` finds it).
4. Open the Adjustments tab by clicking its `[role=tab]` element through `eval`; a `text=Adjustments` click lands elsewhere. Leave the Undeposited Payments tab's rows unchecked.
5. Add the lines from **The lines** (253-00 positive, debits negative on the form model), check the Deposit Total equals the payout net, attach the payout PDF, then save through the ribbon: hover `#Approve > a` and click its last `Approve` item. The new id appears in `location.hash`.
6. Reload the deposit and read it with `scripts/read-deposit.js`: Approved, the lines, the total and the PDF.

## The lines

All lines take the deposit's location; the cash line is the bank match and stays as it is.

| Line | Account | Amount |
|---|---|---|
| credit | 253-00 - Event Deposit Liability | the Charges row's Gross |
| debit | 401-27 - Sales-Comps | the Refunds row's Gross, as a positive amount |
| debit | 632-00 - Credit Card Processing Fees | Gross less refunds less the payout net |

The 632-00 figure is the remainder, so it carries every fee the payout deducts: card fees on its own charges, fees on earlier charges taken later, the 10.00 monthly account fee, network and assessment fees, refund fees, 0.15 card-verification charges, and the cent of rounding the portal sometimes adds to Gross. A payout with no fees and no refunds keeps its single 253-00 line and only gets the PDF. On the form, a debit is a negative amount; `post-payout.sh` sets it on the form's model because the amount box swallows a typed minus.
