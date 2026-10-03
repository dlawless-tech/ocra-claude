---
name: bowery-tripleseat-pay
description: Split Bowery Group's Tripleseat Pay payouts in Restaurant365, one Bank Deposit per payout for Rosie's, Vic's and Cookshop, into event deposit gross, card fees and refunds, with the payout page attached as a PDF. Use when asked to run the weekly Bowery Tripleseat Pay deposits, to correct a Bowery Paysafe deposit, or to check one against its Tripleseat payout.
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

- A payout with no deposit has not reached R365 yet. Leave it for next week's run and list it in the report.
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

## The lines

All lines take the deposit's location; the cash line is the bank match and stays as it is.

| Line | Account | Amount |
|---|---|---|
| credit | 253-00 - Event Deposit Liability | the Charges row's Gross |
| debit | 401-27 - Sales-Comps | the Refunds row's Gross, as a positive amount |
| debit | 632-00 - Credit Card Processing Fees | Gross less refunds less the payout net |

The 632-00 figure is the remainder, so it carries every fee the payout deducts: card fees on its own charges, fees on earlier charges taken later, the 10.00 monthly account fee, network and assessment fees, refund fees, 0.15 card-verification charges, and the cent of rounding the portal sometimes adds to Gross. A payout with no fees and no refunds keeps its single 253-00 line and only gets the PDF. On the form, a debit is a negative amount; `post-payout.sh` sets it on the form's model because the amount box swallows a typed minus.
