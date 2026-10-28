# Task Scheduler entry point, Wednesdays hourly 8:00-18:00. Once this week's dLena AP Aging.xlsx is in
# Downloads, runs the skill unattended, posts to Teams, then moves the file into the week folder.
# usage: wednesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. -Force reruns a day already marked done.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Drop = "C:\Users\trici\OCRA\TML's Files - General\Downloads"
$Aging = Join-Path $Drop 'dLena AP Aging.xlsx'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$day = '{0}/{1}/{2}' -f $today.Month, $today.Day, $today.Year
$md = '{0}.{1}' -f $today.Month, $today.Day
# week folder named for the Sunday before the run, changes weekly
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$weDir = Join-Path $Drop ('WE {0}.{1}' -f $sun.Month, $sun.Day)
$run = Join-Path $Repo (".scratch\dlena-ap-pymt\run{0:MMdd}" -f $today)
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$title = "dLena AP Pymt & Confirmation $day"

# wait for this week's drop; a file from before Monday is stale
$f = Get-Item -LiteralPath $Aging -ErrorAction SilentlyContinue
if (-not $f -or $f.LastWriteTime -lt $today.AddDays(-2)) {
  if ((Get-Date).Hour -ge 18 -and -not $Date) {
    New-Item -ItemType Directory -Force $run | Out-Null
    Set-Content -Encoding utf8 $done "no drop $(Get-Date -Format s)"
    & $Notify -Title "$title waiting on AP Aging" -Lines @("No dLena AP Aging.xlsx from this week in Downloads by 6 PM, so no payments were made.", 'Drop it, then run wednesday-run.ps1 -Force.')
  }
  exit 0
}
# still being written
if ($f.LastWriteTime -gt (Get-Date).AddMinutes(-5)) { exit 0 }
# starts only after Tricia sends the reviewed AP Aging email
$agingSubject = 'dLena Weekly AP we {0}.{1}' -f $sun.Month, $sun.Day
$sentItems = (New-Object -ComObject Outlook.Application).GetNamespace('MAPI').GetDefaultFolder(5).Items
if (-not @($sentItems.Restrict("[Subject] = '$agingSubject'")).Count) {
  if ((Get-Date).Hour -ge 18 -and -not $Date) {
    New-Item -ItemType Directory -Force $run | Out-Null
    Set-Content -Encoding utf8 $done "no aging email $(Get-Date -Format s)"
    & $Notify -Title "$title waiting on AP Aging email" -Lines @("'$agingSubject' was not in Sent Items by 6 PM, so no payments were made.", 'Send it, then run wednesday-run.ps1 -Force.')
  }
  exit 0
}

New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'wednesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$result = Join-Path $run 'result.json'
Remove-Item -ErrorAction SilentlyContinue $result
# no retry: a rerun after an approve could pay twice
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"

Log "run $day; AP Aging dropped $($f.LastWriteTime)"
$prompt = @"
/dlena-ap-pymt-confirmation Unattended run for $day. Follow the skill's Unattended run section.
Run date M.D: $md
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing
Set-Location $run
& playwright-cli -s=dlp close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check R365 and Sent Items before rerunning, a payment may already be approved. Log:', $log)
  exit 1
}
$r = Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json
$ok = -not $r.note -and @($r.vendors).Count -eq 2 -and -not @($r.vendors | Where-Object { $_.status -ne 'none' -and -not ($_.status -eq 'paid' -and $_.attached -and $_.emailed) }).Count
$moved = ''
if ($ok) {
  New-Item -ItemType Directory -Force $weDir | Out-Null
  Move-Item -Force -LiteralPath $Aging -Destination $weDir
  $stubs = @(Get-ChildItem -LiteralPath $Drop -Filter "$md dLena_* Payment Stub Reprint.pdf")
  $stubs | Move-Item -Force -Destination $weDir
  $moved = "AP Aging and $($stubs.Count) payment stubs moved to $weDir"
  Log $moved
}
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
& $Notify -Title $title -ResultFile $result -Moved $moved
