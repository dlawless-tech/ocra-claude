# Task Scheduler entry point. Runs the skill unattended once last week's Change Order Report lands in the folder.
# usage: monday-run.ps1 [-Date yyyy-MM-dd] [-Cutoff 12:00] [-Force]
# -Date stands in for today. One marker per week, so later triggers do nothing without -Force. Posts the result to Teams.
param([string]$Date, [string]$Cutoff = '12:00', [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Folder = 'C:\Users\trici\OCRA\NORMS - General\Journal Entries\Wkly Change Orders'
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

# the Sunday-Saturday week that ended before today
$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sat = $today.AddDays(-(([int]$today.DayOfWeek + 1) % 7))
if ($sat -eq $today) { $sat = $sat.AddDays(-7) }
$sun = $sat.AddDays(-6)
$weFull = '{0}/{1}/{2}' -f $sat.Month, $sat.Day, $sat.Year
$run = Join-Path $Repo (".scratch\norms-change-orders\wk{0:MMdd}" -f $sat)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'monday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }

# week in the name as M.D-M.D; the words around it drift
$re = '(^|\D)' + $sun.Month + '\.' + $sun.Day + '\s*-\s*' + $sat.Month + '\.' + $sat.Day + '(\D|$)'
$file = Get-ChildItem -LiteralPath $Folder -File -Filter '*.xlsx' | Where-Object { $_.Name -match $re -and $_.Name -notlike '~$*' } | Select-Object -First 1
$title = "NORMS Change Orders, W.E. $weFull"

if (-not $file -or $file.LastWriteTime -gt (Get-Date).AddMinutes(-5)) {
  Log "waiting: $(if ($file) { "$($file.Name) still syncing" } else { 'no report yet' })"
  if (-not $file -and $today -eq (Get-Date).Date -and (Get-Date) -ge [datetime]::Parse($Cutoff)) {
    Set-Content -Encoding utf8 $marker "gave up $(Get-Date -Format s)"
    & $Notify -Title "$title not posted" -Lines @("No Change Order Report for $($sun.Month).$($sun.Day)-$($sat.Month).$($sat.Day) in Wkly Change Orders by $Cutoff.", 'Nothing was posted. Run the skill by hand once the report is in.')
  }
  exit 0
}

Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Log "found $($file.Name); starting claude"
$prompt = @"
/norms-weekly-change-orders Unattended run for the week ending $weFull. Follow the skill's Unattended run section.
Work directory: $run
Report: $($file.FullName)
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; sessions bind to the work dir
Push-Location $run; & playwright-cli -s=co close 2>&1 | Out-Null; Pop-Location

$result = Join-Path $run 'result.json'
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
