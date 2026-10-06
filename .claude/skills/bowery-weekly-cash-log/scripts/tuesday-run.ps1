# Task Scheduler entry point. Runs the skill unattended once all five logs for last Sunday are in.
# usage: tuesday-run.ps1 [-Cutoff 12:00] [-Force]
# Writes one marker per week so later triggers do nothing. Posts the result to Teams.
param([string]$Cutoff = '12:00', [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = Resolve-Path "$PSScriptRoot\..\..\..\.."
$Folder = 'C:\Users\trici\OCRA\Bowery Group - General\Journal Entries\Weekly Cash Logs'
$Stores = @('Cookshop', 'Shuka', "Rosie's", 'Shukette', "Vic's")
$Notify = "$PSScriptRoot\notify-teams.ps1"

$today = (Get-Date).Date
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$we = '{0}.{1}.{2:yy}' -f $sun.Month, $sun.Day, $sun
$weFull = '{0}/{1}/{2}' -f $sun.Month, $sun.Day, $sun.Year
$run = Join-Path $Repo (".scratch\bowery-cash-log\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }

# store name + week ending; the rest of the name drifts (Shukette's "Payours")
$found = @{}
foreach ($f in Get-ChildItem -LiteralPath $Folder -File -Filter '*.pdf') {
  foreach ($s in $Stores) {
    $re = '^' + [regex]::Escape($s).Replace("'", "['\u2019]") + ' Cash .* W\.E\. ' + [regex]::Escape($we) + '\.pdf$'
    if ($f.Name -match $re) { $found[$s] = $f }
  }
}
$missing = @($Stores | Where-Object { -not $found.ContainsKey($_) })
$fresh = @($found.Values | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) })

if ($missing.Count -or $fresh.Count) {
  Log "waiting: missing $($missing -join ', '); syncing $($fresh.Name -join ', ')"
  if ((Get-Date) -ge [datetime]::Parse($Cutoff) -and $missing.Count) {
    Set-Content -Encoding utf8 $marker "gave up $(Get-Date -Format s)"
    & $Notify -Title "Bowery cash logs W.E. $weFull not posted" -Lines @("Still missing at $Cutoff`: $($missing -join ', ').", 'Nothing was posted. Run the skill by hand once the logs are in.')
  }
  exit 0
}

Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Log "all five in; starting claude"
$files = ($Stores | ForEach-Object { "- $_`: $($found[$_].FullName)" }) -join "`n"
$prompt = @"
/bowery-weekly-cash-log Unattended run for the week ending $weFull. Follow the skill's Unattended run section.
Work directory: $run
Logs:
$files
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"

$result = Join-Path $run 'result.json'
if (-not (Test-Path $result)) {
  & $Notify -Title "Bowery cash logs W.E. $weFull FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title "Bowery cash logs W.E. $weFull" -ResultFile $result
