---
name: dlena-weekly-ap-aging
description: Send dLena's weekly AP Aging email, running the saved AP Aging view in Restaurant365, exporting it to Excel as dLena AP Aging.xlsx and attaching it to the "dLena Weekly AP we <M.D>" email to the owners and their CPAs. Use when asked to run or send the dLena weekly AP Aging, or to pull dLena's AP Aging as Excel.
---

# dLena weekly AP Aging

Every Wednesday dLena's owners get the AP Aging as of today, in Excel, so they can review it and make the week's payments. The subject names the week ending: the Sunday before the run, as `M.D`. A 10/14/2026 run sends `dLena Weekly AP we 10.11`.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) when a step misbehaves.

## Step 1: log in

R365 is `https://unoatfifth.restaurant365.com`, on the same login as Bowery:

```bash
sed 's/bowerygroup\.restaurant365\.com/unoatfifth.restaurant365.com/g' <skills>/bowery-ubereats/scripts/r365-login.sh > login.sh
bash login.sh dla
```

## Step 2: saved report, exported to Excel

```bash
bash <skill>/scripts/run-aging.sh dla "$PWD"
cp "dLena AP Aging.xlsx" "/c/Users/trici/OCRA/TML's Files - General/Downloads/"
```

The script opens the AP Aging card on My Reports, sets it to the saved **AP Aging** view, and runs it from the Customize dialog's Run. The view is As Of Today, Detail, Hide $0 Balances Yes, aged by Due Date, Show Unapproved **No**. In the report tab it clicks the save icon, then **Excel**, and saves the download as `dLena AP Aging.xlsx`. Done when it prints `as of <today>` and the saved size. The Downloads copy is overwritten each week.

## Step 3: email

```powershell
& <skill>\scripts\mail.ps1 -WE 10.11 -Attach "C:\Users\trici\OCRA\TML's Files - General\Downloads\dLena AP Aging.xlsx"
```

The script copies the newest sent `dLena Weekly AP we ...` email: the same To (May May and Carlos Horcasitas, Tom McDowell, Megan Pensack, Chef Carlos Camacho) and Cc (Jessica Flores, Collin Heyerdahl, Tricia). TCampanella stays off, even when the copied email still has them. The body is "Good morning!" (or "Good afternoon!" after noon), "Attached please find the weekly AP Aging report for your review and to make the weekly payments.", "Please let us know if there are any questions we can assist with.", then the default signature. It saves a draft and opens it in Outlook. Show the human the printed subject, recipients and attachment. Once they say send, rerun with `-Send`, which sends the reviewed draft as is. The script refuses a week already sent.

## Finish

Done when the email is in Sent Items with the file attached. Close only this run's session, from the run directory:

```bash
playwright-cli -s=dla close
```

Then run the `dlena-ap-pymt-confirmation` skill for the same day. On Wednesdays its scheduled run starts on its own once the file is in Downloads, and moves the file into the week folder when it finishes.

## Runs

10/14/2026, built live. AP Aging as of 10/14 exported (16 KB), `dLena Weekly AP we 10.11` drafted.
