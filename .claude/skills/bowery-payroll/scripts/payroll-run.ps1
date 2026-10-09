# Task Scheduler entry point. Waits for the week's files in the Payroll folder, runs the skill unattended, then posts to Teams.
# usage: payroll-run.ps1 [-Mode watch|scheduled] [-Date yyyy-MM-dd] [-Force]
# watch: quiet until the files are in. scheduled: Thursday evening backstop, posts once when they are missing.
# Ready: one GL workbook plus an hourly Net Pay Report for each store, nothing written in the last 10 minutes.
param([ValidateSet('watch', 'scheduled')][string]$Mode = 'watch', [string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Drop = 'C:\Users\trici\OCRA\Bowery Group - General\Payroll'
$Stores = 'Cookshop', "Rosie", 'Shuka', 'Shukette', "Vic"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-[int]$today.DayOfWeek)
$weFull = '{0}/{1}/{2}' -f $sun.Month, $sun.Day, $sun.Year
$run = Join-Path $Repo (".scratch\bowery-payroll\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'payroll-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }

$files = @(Get-ChildItem -LiteralPath $Drop -File | Where-Object { $_.Name -notlike '~*' -and $_.Name -notlike '.*' })
$gl = @($files | Where-Object { $_.Extension -eq '.xlsx' })
$pdf = @($files | Where-Object { $_.Name -like '*Net Pay Report*.pdf' })
$hourly = @($pdf | Where-Object { $_.Name -notlike '*Salary*' })
# Shuka must not match Shukette
$missing = @($Stores | Where-Object { $s = $_; -not ($hourly | Where-Object { $_.Name -match "\b$s('?s)?\b" }) })
if ($gl.Count -ne 1) { $missing = @('the GL workbook') + $missing }
$fresh = $files.Count -and (($files | Measure-Object LastWriteTime -Maximum).Maximum -gt (Get-Date).AddMinutes(-10))

if ($missing.Count -or $files.Count -lt 6 -or $fresh) {
  if ($Mode -eq 'scheduled') {
    $mark = Join-Path $run ("missing-{0:yyyyMMdd}.txt" -f (Get-Date))
    if (-not (Test-Path $mark)) {
      Set-Content -Encoding utf8 $mark (Get-Date -Format s)
      $why = if ($missing.Count) { "Still missing: $($missing -join ', ')." } elseif ($fresh) { 'Files were still arriving in the last 10 minutes.' } else { "Only $($files.Count) files." }
      & $Notify -Title "Bowery Payroll, W.E. ${weFull}: files not complete" -Lines @("As of $(Get-Date -Format 'ddd M/d h:mm tt') the Payroll folder holds $($files.Count) files. $why", 'Nothing was posted. Run the payroll by hand once the files are in.')
    }
  }
  exit 0
}

# the run works from copies; the originals stay put until filed
$copy = Join-Path $run 'files'
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $copy
New-Item -ItemType Directory -Force $copy | Out-Null
$files | ForEach-Object { Copy-Item -LiteralPath $_.FullName (Join-Path $copy $_.Name) }
$manifest = Join-Path $run 'manifest.txt'
$files.FullName | Set-Content -Encoding utf8 $manifest
$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"
Log "starting claude ($Mode), $($files.Count) files: $($files.Name -join '; ')"

$prompt = @"
/bowery-payroll Unattended run for the week ending $weFull. Follow the skill's Unattended run section.
Work directory: $run
Week files (copies): $copy
GL workbook: $(Join-Path $copy $gl[0].Name)
Manifest of originals: $manifest
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=bpu close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

$title = "Bowery Payroll, W.E. $weFull"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
# period-end tips recon; it exits on its own unless this week closed a period
if ((Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json).filed) {
  try { Start-ScheduledTask -TaskName 'Bowery PE Tips Recon' } catch { Log "tips recon task not started: $_" }
}
