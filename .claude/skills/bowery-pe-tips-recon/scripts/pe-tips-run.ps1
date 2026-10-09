# Task Scheduler entry point. After the last payroll of a fiscal period is filed, runs the skill
# unattended for that period, then posts the confirmation to Teams.
# usage: pe-tips-run.ps1 [-WeekEnding <yyyy-MM-dd>] [-Force]
# Started by payroll-run.ps1 once it files a week, with Thursday 7 PM and Friday 9 AM backstops.
# Exits quietly when the week ending is not a period end.
param([string]$WeekEnding, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$PayDone = 'C:\Users\trici\OCRA\Bowery Group - General\Payroll\Completed'

$today = (Get-Date).Date
$sun = if ($WeekEnding) { [datetime]::ParseExact($WeekEnding, 'yyyy-MM-dd', $null) } else { $today.AddDays(-[int]$today.DayOfWeek) }
$p = & node "$PSScriptRoot\period.js" ('{0:yyyy-MM-dd}' -f $sun) | ConvertFrom-Json
if (-not $p.isPeriodEnd) { exit 0 }

$run = Join-Path $Repo (".scratch\bowery-pe-tips\{0}" -f ($p.label -replace "'", '-'))
New-Item -ItemType Directory -Force $run | Out-Null
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$log = Join-Path $run 'run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

# trigger: the period's last payroll filed to Completed, which happens only once all six entries are approved
$week = Join-Path $PayDone ('WE {0:MM.dd.yy}' -f $sun)
$filed = (Test-Path -LiteralPath $week) -and @(Get-ChildItem -LiteralPath $week -Filter *.xlsx).Count
if (-not $filed -and -not $Force) {
  $mark = Join-Path $run 'waiting.txt'
  if ($today.DayOfWeek -eq 'Friday' -and -not (Test-Path $mark)) {
    Set-Content -Encoding utf8 $mark (Get-Date -Format s)
    & $Notify -Title "Bowery $($p.label) Tips Payable, waiting on payroll" -Lines @("Payroll for W.E. $($p.end) is not filed to Completed as of $(Get-Date -Format 'ddd M/d h:mm tt'), so the period-end Tips Payable entries were not posted. Run them by hand once payroll is done.")
  }
  exit 0
}

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"
Log "starting claude for $($p.label), $($p.start) - $($p.end)"
$prompt = @"
/bowery-pe-tips-recon Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Period: $($p.label)
Period end: $($p.end)
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=tipu close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

$title = "Bowery $($p.label) Tips Payable"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
