---
name: dlena-weekly-ap-aging
description: Send dLena's weekly AP Aging email once Tricia drops dLena AP Aging.xlsx in Downloads, attaching it to the "dLena Weekly AP we <M.D>" email to the owners and their CPAs, from a Wednesday watcher task. Use when asked to run or send the dLena weekly AP Aging email, or to change its schedule.
---

# dLena weekly AP Aging

Every Wednesday dLena's owners get the AP Aging as of today, in Excel, so they can review it and make the week's payments. The subject names the week ending: the Sunday before the run, as `M.D`. A 10/14/2026 run sends `dLena Weekly AP we 10.11`.

Tricia runs the AP Aging herself and drops it in `C:\Users\trici\OCRA\TML's Files - General\Downloads` as `dLena AP Aging.xlsx`. The drop starts the email. This skill never runs the report in R365.

## Scheduled run

`scripts/wednesday-run.ps1` runs from Task Scheduler on Wednesdays every 15 minutes from 8:00 to 18:00 (`scripts/register-task.ps1` sets it up). Each start looks for `dLena AP Aging.xlsx` written since Monday and at least 5 minutes old, in Downloads or in `Downloads\WE <M.D>`, where the `dlena-ap-pymt-confirmation` run moves it when it finishes. Without it the start exits quietly. That run posts the 6 PM waiting card for a missing drop, so this one does not.

Once the file is there, the wrapper copies it to `.scratch/dlena-ap-aging/run<MMdd>`, marks the day started in `done.txt`, and drafts the email with `mail.ps1`, which saves it and opens it in Outlook. It never sends: Tricia reviews the draft and clicks Send herself. A draft-ready card, or a FAILED card when no draft was made, goes to the dLena Teams channel tagging Tricia through the AP Pymt skill's `notify-teams.ps1`. The day never retries on its own. `-Force` reruns it, `-Date yyyy-MM-dd` stands in for today, and `-DryRun` prints what it would draft.

The `dlena-ap-pymt-confirmation` run waits until this email is in Sent Items.

## Email

```powershell
& <skill>\scripts\mail.ps1 -WE 10.11 -Attach "C:\Users\trici\OCRA\TML's Files - General\Downloads\dLena AP Aging.xlsx"
```

The script copies the newest sent `dLena Weekly AP we ...` email: the same To (May May and Carlos Horcasitas, Tom McDowell, Megan Pensack, Chef Carlos Camacho) and Cc (Jessica Flores, Collin Heyerdahl, Tricia). TCampanella stays off, even when the copied email still has them. The body is "Good morning!" (or "Good afternoon!" after noon), "Attached please find the weekly AP Aging report for your review and to make the weekly payments.", "Please let us know if there are any questions we can assist with.", then the default signature. Without `-Send` it saves a draft and opens it in Outlook. With `-Send` it sends, or sends a draft already in Drafts as is. The script refuses a week already sent.

Done when the email is in Sent Items with the file attached.

## Runs

10/14/2026, built live. AP Aging as of 10/14 exported from R365 (16 KB), `dLena Weekly AP we 10.11` drafted.

10/28/2026, switched to the file drop. Tricia dropped the file at 8:49, and the 9:00 start drafted `we 10.25`, but Outlook's `Send()` threw "Value does not fall within the expected range" twice while a message window was open, leaving the draft in Drafts. `mail.ps1` now reports that as `FAIL:` instead of `SENT`. Tricia wants to review every week's email before it goes, so the task now only drafts it. The task starts at 8:00 from 11/4.
