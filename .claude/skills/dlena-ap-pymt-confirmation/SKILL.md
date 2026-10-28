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

The script copies the newest sent `dLena Weekly <Tag> Payment ...` email: the same To and Cc (Jessica Flores, Collin Heyerdahl, Tricia), the subject `dLena Weekly <Tag> Payment <M.D>`, and the body "Good morning," (or "Good afternoon," after noon) followed by "Attached please find the weekly payment detail for dLena to be applied to the listed invoices." with the default signature. It saves the email as a draft and opens it in Outlook. Show the human the printed recipients and attachment. Once they say send, rerun with `-Send`, which sends the reviewed draft as is. Auto mode's classifier blocks a send it was not asked for. The script refuses a week whose email was already sent.

## Finish

Done when every paying vendor has an approved payment with its stub attached, its file in Downloads, and its email in Sent Items. Close only this run's session, from the run directory:

```bash
playwright-cli -s=dl close
```

Then move `dLena AP Aging.xlsx` and the week's `<M.D> dLena_<File stem> Payment Stub Reprint.pdf` files out of Downloads into the week folder, `Downloads\WE <M.D>`, named for the week ending, the Sunday before the run day. The name changes every week: a 10/21/2026 run files to `WE 10.18`, a 10/28 run to `WE 10.25`. Create the folder when it is missing.

## Unattended run

`scripts/wednesday-run.ps1` runs from Task Scheduler on Wednesdays, hourly from 8:00 through 18:00 (`scripts/register-task.ps1` sets it up, first run 10/28/2026). Each start checks Downloads for `dLena AP Aging.xlsx` written since Monday and at least 5 minutes old. Tricia drops that file once she approves the aging. The start also waits for her `dLena Weekly AP we <M.D>` email (the `dlena-weekly-ap-aging` skill drafts it) to be in Sent Items. Without both it exits quietly. The 18:00 start posts a waiting card instead. Once the file is there, the wrapper marks the day started in `.scratch/dlena-ap-pymt/run<MMdd>/done.txt` and starts this skill headless with a prompt beginning `Unattended run` that names the work directory and the run's `M.D`. The day never retries on its own, since a rerun after an approve could pay a vendor twice. `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- `cd` into the work directory once and run every command from there. Log R365 in as `dlp`, and use `dlp` wherever the steps say `dl`.
- Never ask. Run Steps 2 to 5 for both vendors, Halperns first. Step 2 must print `ties`, or stop before any payment with the reason in `note`.
- Run `new-payment.sh` once without `approve` and check the zero-to-zero rule, then once with `approve`. A `FAIL:` before `APPROVED` is retried once after closing the tab. Once `APPROVED` has printed, never create that vendor's payment again: a later failure is `failed` with the payment id.
- Tricia authorized the vendor emails to go out unattended. Draft with `mail.ps1`, check the printed To and Cc match the copied email and the only attachment is this week's stub, then rerun with `-Send`. Any mismatch leaves the draft unsent and the vendor `failed`.

Finish by closing `dlp` by name, then write `result.json` in the work directory:

```json
{ "note": "",
  "vendors": [ { "vendor": "Halperns' Steak & Seafood", "status": "paid", "payment": "<payment id>", "amount": 14075.55, "invoices": 10, "attached": true, "emailed": true, "reason": "",
      "unapproved": [ { "invoice": "12487487", "amount": 2839.72, "comment": "MISSING IN MARGIN EDGE" } ] } ] }
```

`status` is `paid`, `none` (`NONE` from `new-payment.sh`) or `failed`. List both vendors every week. The wrapper moves the AP Aging and the stubs into the week folder only when both vendors are `none` or `paid` with the stub attached and the email sent, and `note` is empty. Otherwise the files stay in Downloads. `scripts/notify-teams.ps1` posts the result to the dLena Bank Activity channel through the webhook in `~/.claude/dlena-stripe-deposits.json`. A clean result posts untagged. `NEEDS REVIEW`, `FAILED` and waiting cards tag Tricia. Unapproved invoices left open are listed but do not need review.

## Runs

10/7/2026, built live. Halperns ACH 9,411.23 (9 invoices) and Julius Silvert ACH 4,082.15 (5 invoices) were approved, stubs attached, and emails sent. Five Halperns invoices and three Julius invoices were unapproved and left open.

10/14/2026, first full scripted run, after the AP Aging email. Halperns ACH 14,075.55 (10 invoices) and Julius Silvert ACH 10,111.66 (9 invoices) were approved by `new-payment.sh approve`, stubs attached by `attach.sh`, and emails sent. Two Halperns invoices were unapproved and left open.
