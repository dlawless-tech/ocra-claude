---
name: danny-coops-7shifts-payroll-import-file
description: Download Danny & Coop's weekly payroll journal CSV from 7shifts Payroll into the Danny & Coops Payroll folder, the import file danny-coops-payroll posts from. Use when asked to pull, download, or check the Danny & Coops 7shifts payroll journal or payroll import file, or when the Tuesday scheduled run starts it.
---

# 7shifts payroll journal into the Danny & Coops Payroll folder

`danny-coops-payroll` posts the week once a `*payroll-journal*.csv` sits loose in its drop folder. This skill supplies that file:

```
C:\Users\trici\OCRA\Danny and Coops - General\Payroll\
  payroll-journal_2026-10-20.csv     7shifts' name with _ for -; the date is the export day (UTC)
  Completed\                         danny-coops-payroll files posted weeks here
```

The week is Monday to Sunday. The file's Period End column carries the week ending; the name's date does not.

## 7shifts

Login is under `## 7shifts` in `~/.claude/danny-coops-credentials.md`. Sign-in asks for a text code to the phone ending 8077 unless the browser holds a trusted-device cookie, so every run uses the persistent profile `~/.claude/playwright-profiles/danny-coops-7shifts`, trusted on 10/20/2026 for 45 days.

When 7shifts asks for the code, `journal.js` checks "Trust this device for 45 days", posts a Teams card tagging Tricia through `scripts/notify-teams.ps1` (webhook and mention in `~/.claude/danny-coops-7shifts.json`), and waits 45 minutes for the code. Tricia types it into the open browser window, or the 6 digits land in `code.txt` in the work directory, which the script fills in. In a hand run, ask Tricia for the code in chat and write it to that `code.txt`. No code in 45 minutes is a `problem`.

`app.7shifts.com/payroll` lands on the overview. The **Payroll History** table lists one row per pay period, newest first, with Pay Period (`Oct 12, 2026 - Oct 18, 2026`), Type, Status, and Expected Pay Day. The top row is last week's payroll: `Pending` once submitted, `Paid` after payday. Its row button opens a menu with **Download payroll journal (CSV)**.

## Run it

```bash
node scripts/journal.js <work dir> "C:\Users\trici\OCRA\Danny and Coops - General\Payroll" <M/D/YYYY week ending>
```

It prints one JSON line:

- `kept`: a journal for that Period End already sits in the Payroll folder or its `Completed`. Nothing opened.
- `not ready`: the top row is an earlier week or still a Draft. `top` shows the row.
- `saved`: the top row's journal is downloaded, every row's Period End equals the week ending, and the file is copied to the Payroll folder. `file` names it.
- `problem`: sign-in stopped at the text code or elsewhere, or the file covers another week. Nothing is saved.

Done is `saved` or `kept`. On `saved`, the unattended run hands the file straight to `danny-coops-payroll`'s `payroll-run.ps1 -File`, which posts the entry.

## Unattended run

`scripts/import-run.ps1` is the Task Scheduler entry, registered by `scripts/register-task.ps1` as **Danny & Coops 7shifts Payroll Import File**: hourly from Tuesday noon to Wednesday 5:00 PM. The payroll watch (Tuesday 1:00 PM on) only backs up the hand-off. The week ending is the Sunday before the run date. Work and logs go to `.scratch\danny-coops-7shifts-payroll-import-file\wk<MMdd>\`, and `done.txt` there ends the week. `-Date yyyy-MM-dd` runs another week and `-Force` reruns one.

`saved`, `kept`, and `not ready` post nothing. A `problem` posts one Teams card per week through `danny-coops-payroll`'s `notify-teams.ps1` to the payroll channel, then retries on the next tick. A file that never arrives is reported by the payroll skill's Wednesday 7:00 PM backstop.
