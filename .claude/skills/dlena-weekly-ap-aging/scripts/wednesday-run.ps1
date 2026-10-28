# Task Scheduler entry point, Wednesdays every 15 min 8:00-18:00. Once this week's dLena AP Aging.xlsx
# is dropped in Downloads, drafts the "dLena Weekly AP we <M.D>" email with it attached for Tricia to send.
# usage: wednesday-run.ps1 [-Date yyyy-MM-dd] [-Force] [-DryRun]
# -Date stands in for today. -Force reruns a day already marked done. -DryRun prints what it would draft.
param([string]$Date, [switch]$Force, [switch]$DryRun)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$Repo\.claude\skills\dlena-ap-pymt-confirmation\scripts\notify-teams.ps1"
$Drop = "C:\Users\trici\OCRA\TML's Files - General\Downloads"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
# subject names the Sunday before the run
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$we = '{0}.{1}' -f $sun.Month, $sun.Day
$run = Join-Path $Repo (".scratch\dlena-ap-aging\run{0:MMdd}" -f $today)
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$title = "dLena Weekly AP we $we"

# AP Pymt run may already have moved the file into the week folder
$f = @((Join-Path $Drop 'dLena AP Aging.xlsx'), (Join-Path $Drop "WE $we\dLena AP Aging.xlsx")) |
  ForEach-Object { Get-Item -LiteralPath $_ -ErrorAction SilentlyContinue } | Select-Object -First 1
# a file from before Monday is stale
if (-not $f -or $f.LastWriteTime -lt $today.AddDays(-2)) { exit 0 }
# still being written
if ($f.LastWriteTime -gt (Get-Date).AddMinutes(-5)) { exit 0 }

New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'wednesday-run.log'
# copy so the AP Pymt move cannot pull the file mid-send
$att = Join-Path $run 'dLena AP Aging.xlsx'
Copy-Item -Force -LiteralPath $f.FullName -Destination $att
if ($DryRun) { "would draft '$title' with $($f.FullName) ($($f.LastWriteTime))"; exit 0 }

Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"
$ErrorActionPreference = 'Continue'
# draft only; Tricia reviews and sends it, which starts the AP Pymt run
$out = & "$PSScriptRoot\mail.ps1" -WE $we -Attach $att 2>&1 | Out-String
$out | Out-File -Append -Encoding utf8 $log
$ErrorActionPreference = 'Stop'
if ($out -match "DRAFT $([regex]::Escape($title))" -and $out -notmatch 'FAIL:') {
  Set-Content -Encoding utf8 $done "drafted $(Get-Date -Format s)"
  $info = @($out -split "`r?`n" | Where-Object { $_ -match '^(recipients|attachments):' })
  & $Notify -Title "$title draft ready" -Lines (@('The AP Aging email is open in Outlook and saved in Drafts. Review it and click Send. The AP Pymt run starts once it is in Sent Items.') + $info)
} else {
  & $Notify -Title "$title FAILED" -Lines @("The AP Aging email draft was not made. Mail output:", $out.Trim(), 'Fix, then run wednesday-run.ps1 -Force.')
  exit 1
}
