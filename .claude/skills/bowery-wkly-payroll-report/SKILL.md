---
name: bowery-wkly-payroll-report
description: Pull each Bowery Group location's Paycor Net Pay Report for the week into the Bowery Payroll folder, named for bowery-payroll, hourly and salary runs both checked. Use when asked to pull, download, or check the Bowery Net Pay Reports or the weekly Paycor payroll report, or when the Wednesday scheduled run starts it.
---

# Paycor Net Pay Reports into the Bowery Payroll folder

`bowery-payroll` posts the week only once the GL workbook and the Net Pay Reports sit loose in its drop folder. The GL is dropped by hand; this skill supplies the reports:

```
C:\Users\trici\OCRA\Bowery Group - General\Payroll\
  10.11.26 Payroll GL.xlsx                  dropped by hand, starts this skill
  10.11 Cookshop Net Pay Report.pdf         one run with a report: location only
  10.11 Rosie's Hourly Net Pay Report.pdf   two runs with a report: Hourly and Salary added
  10.11 Rosie's Salary Net Pay Report.pdf
```

The prefix is the period ending as `M.D`, no leading zeros (`10.4`, `10.11`), read from the GL's own name.

## Paycor

Login is under `## Paycor` in `~/.claude/bowery-credentials.md`, no verification code. **One session per user**: signing in ends anyone else's `ocrapaycor` session, and loading the sign-in page ends the script's own. Sign in once per run and close at the end.

Main Navigation > Reports > Payroll Reports > **Post Payroll Reports** lands on `secure.paycor.com/onlinereports/index.html#/CurrentReports`. The company switcher at the top picks the entity; changing the URL's `/c/<id>` alone does not switch it. **Current Payroll** lists the company's runs, and each run page has **Payroll Reports: Open**, a dropdown of that run's reports. Choosing **Net Pay Report** loads the PDF in a frame from `hcm.paycor.com/PayrollReportService/download/...`, fetched with the session's cookies.

| Company | Location | Runs |
|---|---|---|
| 155090 156 Tenth Avenue Restaurant, LLC. | Cookshop | `..._01` hourly, `CKSHPSALARY` |
| 155030 Second Street Restaurant LLC | Rosie's | `..._01` hourly, `ROSIESALARY` |
| 154921 38 MacDougal, LLC. | Shuka | `..._01` hourly, `SHUKASALARY` |
| 155093 230 Ninth Avenue Restaurant LLC | Shukette | `..._01` hourly, `SHKTESALARY` |
| 154922 31 Great Jones Restaurant Corp | Vic's | `..._01` hourly, `VICSSALARY` |
| 155050 Bowery Group Corp | Bowery Group | `BOWERY GROUP CORP_01` only |

A run lists Net Pay Report only when it paid live checks. Every store's hourly run has one. Salary runs and Bowery Group usually have none, so check every run each week: Rosie's salary carried two checks for 10/11. Bowery Group has one run, so picking it lands straight on the run page with no run list.

## Run it

```bash
node scripts/netpay.js <work dir> "C:\Users\trici\OCRA\Bowery Group - General\Payroll" <M/D/YYYY week ending>
```

`netpay.js` signs in, walks all six companies with `walk.js`, and prints one JSON line. It saves nothing unless every check passes:

- each store's hourly run has a Net Pay Report
- every report's footer **Period Ending** equals the week ending, which catches Paycor still showing the prior week
- no two runs map to one file name

`status: saved` lists `saved` and `kept`. A file already in the folder under the same name is kept as is. `status: problem` lists `problems`, and the folder is untouched.

Done is every report in `files` sitting in the Payroll folder. `bowery-payroll`'s watch then finds the folder complete and posts.

## Unattended run

`netpay-run.ps1` is the Task Scheduler entry, registered by `register-task.ps1` as **Bowery Wkly Payroll Report**: Wednesday 4:00 PM to Thursday 11:50 PM every 10 minutes. It stays quiet until exactly one `*Payroll GL*.xlsx` is in the folder, unchanged for 5 minutes, then takes the week from the GL's name and runs `netpay.js`. Work and logs go to `.scratch\bowery-wkly-payroll-report\wk<MMDD>\`, and `done.txt` there ends the week.

A problem posts one Teams card per week tagging Tricia, then retries hourly. A clean run posts nothing. The card's webhook and mention live in `~/.claude/bowery-netpay.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}}`. `notify-teams.ps1 -DryRun` prints the card without posting.
