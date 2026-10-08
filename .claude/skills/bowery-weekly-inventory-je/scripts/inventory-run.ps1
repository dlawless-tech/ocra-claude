# Task Scheduler entry point. Thursday mornings, once last Sunday's Purchase Transfers is filed,
# runs the skill unattended for that week, then posts to Teams.
# usage: inventory-run.ps1 [-Force] [-WeekEnding <yyyy-MM-dd>]
param([switch]$Force, [string]$WeekEnding)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$PtDone = 'C:\Users\trici\OCRA\Bowery Group - General\Journal Entries\Weekly Purchase Transfers\Completed'
$Base = Join-Path $Repo '.scratch\bowery-inventory'

$sun = if ($WeekEnding) { [datetime]::ParseExact($WeekEnding, 'yyyy-MM-dd', $null) } else { (Get-Date).Date.AddDays(-[int](Get-Date).DayOfWeek) }
$weFull = '{0}/{1}/{2}' -f $sun.Month, $sun.Day, $sun.Year
$run = Join-Path $Base ('we-{0:yyyyMMdd}' -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }

# trigger: the week's Purchase Transfers tracker filed to Completed
$pt = Join-Path $PtDone ('GL_Reallocation_Tracker {0}.{1}.{2:yy}.xlsx' -f $sun.Month, $sun.Day, $sun)
if (-not (Test-Path -LiteralPath $pt) -and -not $Force) {
  $mark = Join-Path $run 'waiting.txt'
  if ((Get-Date).Hour -ge 12 -and -not (Test-Path $mark)) {
    Set-Content -Encoding utf8 $mark (Get-Date -Format s)
    & $Notify -Title "Bowery Inventory, W.E. $weFull, waiting on Purchase Transfers" -Lines @("Purchase Transfers for W.E. $weFull is not filed to Completed as of $(Get-Date -Format 'ddd M/d h:mm tt'), so the Inventory entries were not posted. Run them by hand once it is done.")
  }
  exit 0
}

$log = Join-Path $run 'run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"
Log "starting claude for W.E. $weFull"
$prompt = @"
/bowery-weekly-inventory-je Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Week ending: $('{0:yyyy-MM-dd}' -f $sun)
Today: $(Get-Date -Format 'M/d/yyyy')
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=invu close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

if (-not (Test-Path $result)) {
  & $Notify -Title 'Bowery Inventory FAILED' -Lines @("The W.E. $weFull run ended without a result file. Nothing was confirmed posted. Check the log:", $log)
  exit 1
}
& $Notify -Title "Bowery Inventory, W.E. $weFull" -ResultFile $result
