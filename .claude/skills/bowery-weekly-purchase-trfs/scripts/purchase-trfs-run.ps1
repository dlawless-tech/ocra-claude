# Task Scheduler entry point. Finds a dropped tracker, runs the skill unattended on it, then posts to Teams.
# usage: purchase-trfs-run.ps1 [-Mode watch|scheduled] [-Force] [-File <xlsx>]
# watch: quiet when no tracker is waiting. scheduled: Thursday 10:00, also posts once when last week's tracker is missing.
param([ValidateSet('watch', 'scheduled')][string]$Mode = 'watch', [switch]$Force, [string]$File)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Drop = 'C:\Users\trici\OCRA\Bowery Group - General\Journal Entries\Weekly Purchase Transfers'
$Base = Join-Path $Repo '.scratch\bowery-purchase-trfs'
New-Item -ItemType Directory -Force $Base | Out-Null

# skip a file still syncing and Excel lock files
if ($File) { $found = @(Get-Item -LiteralPath $File) } else {
  $found = @(Get-ChildItem -LiteralPath $Drop -File -Filter 'GL_Reallocation_Tracker*.xlsx' |
    Where-Object { $_.Name -notlike '~$*' -and $_.LastWriteTime -lt (Get-Date).AddMinutes(-2) })
}

$sun = (Get-Date).Date.AddDays(-[int](Get-Date).DayOfWeek)
$weFull = '{0}/{1}/{2}' -f $sun.Month, $sun.Day, $sun.Year

if (-not $found.Count) {
  if ($Mode -eq 'scheduled') {
    $filed = Test-Path -LiteralPath (Join-Path $Drop ('Completed\GL_Reallocation_Tracker {0}.{1}.{2:yy}.xlsx' -f $sun.Month, $sun.Day, $sun))
    $mark = Join-Path $Base ("missing-{0:yyyyMMdd}.txt" -f (Get-Date))
    if (-not $filed -and -not (Test-Path $mark)) {
      Set-Content -Encoding utf8 $mark (Get-Date -Format s)
      & $Notify -Title "Bowery Purchase Transfers, W.E. $weFull, tracker not in yet" -Lines @("No GL_Reallocation_Tracker in Journal Entries\Weekly Purchase Transfers as of $(Get-Date -Format 'ddd M/d h:mm tt'). The entry posts on its own once the tracker is dropped there.")
    }
  }
  exit 0
}

if ($found.Count -gt 1) {
  $mark = Join-Path $Base ("several-{0:yyyyMMdd}.txt" -f (Get-Date))
  if (-not (Test-Path $mark)) {
    Set-Content -Encoding utf8 $mark (Get-Date -Format s)
    & $Notify -Title 'Bowery Purchase Transfers: more than one tracker waiting' -Lines (@('Nothing was posted. Leave one tracker at the top of the folder:') + @($found | ForEach-Object { "- $($_.Name)" }))
  }
  exit 0
}

$f = $found[0]
# one run per file version; a replaced tracker runs again
$run = Join-Path $Base ('run-{0:yyyyMMdd-HHmmss}' -f $f.LastWriteTime)
New-Item -ItemType Directory -Force $run | Out-Null
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$log = Join-Path $run 'run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

# the run works from a copy; the original stays put until it is filed
$copy = Join-Path $run $f.Name
Copy-Item -LiteralPath $f.FullName $copy -Force
$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"
Log "starting claude ($Mode) on $($f.FullName)"
$prompt = @"
/bowery-weekly-purchase-trfs Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Tracker copy: $copy
Original file: $($f.FullName)
Today: $(Get-Date -Format 'M/d/yyyy')
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=ptu close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

if (-not (Test-Path $result)) {
  & $Notify -Title 'Bowery Purchase Transfers FAILED' -Lines @("The run on $($f.Name) ended without a result file. Nothing was confirmed posted, and the tracker stays in the folder. Check the log:", $log)
  exit 1
}
$r = Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json
& $Notify -Title "Bowery Purchase Transfers, W.E. $($r.weekEnding)" -ResultFile $result
# Thursday: Inventory waits on this week being filed; start it now
if ((Get-Date).DayOfWeek -eq 'Thursday' -and $r.filed) {
  try { Start-ScheduledTask -TaskName 'Bowery Inventory - Thursday' } catch { Log "inventory task not started: $_" }
}
