---
name: dlena-ap-pymt-confirmation
description: Run dLena's weekly AP payments in Restaurant365, one ACH manual payment per vendor covering every approved open invoice, with the Check Stub Reprint attached to the payment and emailed to the vendor as confirmation. Use when asked to run the dLena AP Pymt & Confirmation, to create dLena manual payments for Halperns or Julius Silvert, to reprint or attach a dLena check stub, or to send the dLena weekly payment emails.
---

# dLena AP payments and vendor confirmations

Every Wednesday dLena pays two vendors, always and only Halperns and Julius Silvert, by ACH for every approved invoice they have open. Each payment is an AP Payment in R365 on `1122 - dLena Operating - 5002`, number `ACH`, dated the run day. Its Check Stub Reprint is attached to the payment and emailed to the vendor.

| Vendor option in R365 | Email tag | File stem |
|---|---|---|
| `Halperns' Steak & Seafood` | `HALPERN` | `Halpern` |
| `Julius Silvert Inc.` | `JULIUS SILVERT` | `Julius Silvert` |

Files go to `C:\Users\trici\OCRA\TML's Files - General\Downloads` as `<M.D> dLena_<File stem> Payment Stub Reprint.pdf`, for example `10.7 dLena_Halpern Payment Stub Reprint.pdf`.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) when a step misbehaves.

## Step 1: log in

R365 is `https://unoatfifth.restaurant365.com`, on the same login as Bowery. Run a copy of the Bowery login script with the host swapped:

```bash
sed 's/bowerygroup\.restaurant365\.com/unoatfifth.restaurant365.com/g' <skills>/bowery-ubereats/scripts/r365-login.sh > login.sh
bash login.sh dl
```

## Step 2: AP Aging as of today

```bash
bash <skill>/scripts/pull-aging.sh dl <M/D/YYYY> aging.csv
```

This runs AP Aging, Detail, Show Unapproved Yes, for `UNO at 5th and K, LLC dba d'Lena`, and prints each vendor's buckets. Done when the last line reads `ties`. Show the human the totals and each paying vendor's lines.

## Step 3: one payment per vendor

```bash
bash <skill>/scripts/new-payment.sh dl "Halperns' Steak & Seafood"            # review
bash <skill>/scripts/new-payment.sh dl "Halperns' Steak & Seafood" approve    # create
```

The script opens a blank AP Payment on its own tab and sets the account, vendor and `ACH`. The Apply grid lists only **approved** open invoices, and the script prints them. It enters their total as the Amount and clicks Auto-Apply. It then holds the zero-to-zero rule: every invoice paid in full and `$0.00 remaining`. With `approve` it approves and prints `APPROVED <payment id> <amount>`. The tab stays open for Steps 4 and 5. `NONE` (exit 2) means the vendor has nothing approved to pay, and nothing was created.

The vendor's aging lines in Step 2 that are missing from the grid are its unapproved invoices. List them for the human with their comments from All Transactions (`MISSING IN MARGIN EDGE`, `CR NEEDED ...`). They wait for a later week.

The Amount box must be filled before the Apply checkboxes respond, which is why the script uses Auto-Apply. The form also offers **Approve and Close**. Plain **Approve** is the one that keeps the form open.

## Step 4: stub, saved and attached

```bash
bash <skill>/scripts/stub.sh dl <payment id> <amount> "10.7 dLena_Halpern Payment Stub Reprint.pdf"
bash <skill>/scripts/attach.sh dl <payment id> "$PWD/10.7 dLena_Halpern Payment Stub Reprint.pdf"
cp "10.7 dLena_Halpern Payment Stub Reprint.pdf" "/c/Users/trici/OCRA/TML's Files - General/Downloads/"
```

`stub.sh` opens the SSRS Check Stub Reprint for the payment and checks that the stub's Amount equals the payment. It then saves the PDF. Read it and confirm it lists the invoices from Step 3. `attach.sh` uploads to the payment's Attachments tab. The upload saves itself, and the script reloads the payment to prove the count went up. Attach from the run directory, since the Downloads path's apostrophe breaks the upload call. The attachment takes the file's own name. Once it is attached, close the payment's tab.

## Step 5: confirmation emails

```powershell
& <skill>\scripts\mail.ps1 -Tag HALPERN -MD 10.7 -Attach "C:\Users\trici\OCRA\TML's Files - General\Downloads\10.7 dLena_Halpern Payment Stub Reprint.pdf"
```

The script copies the newest sent `dLena Weekly <Tag> Payment ...` email: the same To and Cc (Jessica Flores, Collin Heyerdahl, Tricia), the subject `dLena Weekly <Tag> Payment <M.D>`, and the body "Good morning," (or "Good afternoon," after noon) followed by "Attached please find the weekly payment detail for dLena to be applied to the listed invoices." with the default signature. It saves the email as a draft and opens it in Outlook. Show the human the printed recipients and attachment. Once they say send, rerun with `-Send`. Auto mode's classifier blocks a send it was not asked for. The script refuses a week whose email was already sent or drafted.

## Finish

Done when every paying vendor has an approved payment with its stub attached, its file in Downloads, and its email in Sent Items. Close only this run's session, from the run directory:

```bash
playwright-cli -s=dl close
```

## Runs

10/7/2026, built live. Halperns ACH 9,411.23 (9 invoices) and Julius Silvert ACH 4,082.15 (5 invoices) were approved, stubs attached, and emails sent. Five Halperns invoices and three Julius invoices were unapproved and left open. `attach.sh` and `new-payment.sh approve` came after the run and have not yet run live.
