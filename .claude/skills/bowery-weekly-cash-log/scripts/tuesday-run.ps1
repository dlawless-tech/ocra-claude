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

# store name + week ending; names drift ("Payours", "Cooshop", "W.E 10.11.26")
$StorePattern = @{ 'Cookshop' = 'Coo?k?shop'; 'Shuka' = 'Shuka'; "Rosie's" = "Rosie['\u2019]?s"; 'Shukette' = 'Shukette'; "Vic's" = "Vic['\u2019]?s" }
$found = @{}
$unknown = @()
foreach ($f in Get-ChildItem -LiteralPath $Folder -File -Filter '*.pdf') {
  $hit = $false
  foreach ($s in $Stores) {
    $re = '^' + $StorePattern[$s] + ' Cash .*W\.?\s?E\.?\s*' + [regex]::Escape($we) + '\s*\.pdf$'
    if ($f.Name -match $re) { $found[$s] = $f; $hit = $true }
  }
  if (-not $hit) { $unknown += $f }
}
$missing = @($Stores | Where-Object { -not $found.ContainsKey($_) })
$fresh = @($found.Values | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) })

if ($missing.Count -or $fresh.Count) {
  Log "waiting: missing $($missing -join ', '); syncing $($fresh.Name -join ', '); unrecognized $($unknown.Name -join ', ')"
  # filed weeks live in store subfolders, so a stray root PDF is likely a misnamed log
  $unknownMarker = Join-Path $run 'unrecognized.txt'
  $settled = @($unknown | Where-Object { $_.LastWriteTime -le (Get-Date).AddMinutes(-5) })
  if ($missing.Count -and $settled.Count -and -not (Test-Path $unknownMarker)) {
    Set-Content -Encoding utf8 $unknownMarker ($settled.Name -join "`n")
    & $Notify -Title "Bowery cash logs W.E. $weFull waiting on file names" -Lines (@("Missing: $($missing -join ', '). These PDFs in the folder don't match a store and W.E. $we`:") + @($settled | ForEach-Object { "- $($_.Name)" }) + @("Expected: <Store> Cash Deposits & Payouts W.E. $we.pdf. Rename the file and the next 15-minute check picks it up."))
  }
  if ((Get-Date) -ge [datetime]::Parse($Cutoff) -and $missing.Count) {
    Set-Content -Encoding utf8 $marker "gave up $(Get-Date -Format s)"
    $lines = @("Still missing at $Cutoff`: $($missing -join ', ').", 'Nothing was posted. Run the skill by hand once the logs are in.')
    if ($unknown.Count) { $lines += "Unrecognized PDFs in the folder: $($unknown.Name -join ', ')" }
    & $Notify -Title "Bowery cash logs W.E. $weFull not posted" -Lines $lines
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
# backstop for a run that died before Step 8; sessions bind to the work dir
Push-Location $run; & playwright-cli -s=cl close 2>&1 | Out-Null; Pop-Location

$result = Join-Path $run 'result.json'
if (-not (Test-Path $result)) {
  & $Notify -Title "Bowery cash logs W.E. $weFull FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title "Bowery cash logs W.E. $weFull" -ResultFile $result
