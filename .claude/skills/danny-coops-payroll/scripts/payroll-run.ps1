# Task Scheduler entry point. Finds the dropped payroll journal, runs the skill unattended for its week, then posts to Teams.
# usage: payroll-run.ps1 [-Mode watch|scheduled] [-Force] [-File <csv>]
# watch: quiet when no file is waiting. scheduled: Wednesday afternoon backstop, posts once when the file is missing.
param([ValidateSet('watch', 'scheduled')][string]$Mode = 'watch', [switch]$Force, [string]$File)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Downloads = "C:\Users\trici\OCRA\TML's Files - General\Downloads"
$Base = Join-Path $Repo '.scratch\danny-coops-payroll'
New-Item -ItemType Directory -Force $Base | Out-Null

# journal files outside Completed: Downloads itself and its live week folders; skip one still syncing
if ($File) { $found = @(Get-Item -LiteralPath $File) } else {
  $dirs = @($Downloads) + @(Get-ChildItem -LiteralPath $Downloads -Directory | Where-Object { $_.Name -like 'we *' } | ForEach-Object { $_.FullName })
  $found = @($dirs | ForEach-Object { Get-ChildItem -LiteralPath $_ -File -Filter '*payroll-journal*.csv' } |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-2) } | Sort-Object LastWriteTime -Descending)
}

if (-not $found.Count) {
  if ($Mode -eq 'scheduled') {
    # last Sunday's week already run, or filed by hand
    $sun = (Get-Date).Date.AddDays(-[int](Get-Date).DayOfWeek)
    $ran = Test-Path (Join-Path $Base ("wk{0:MMdd}\done.txt" -f $sun))
    $filed = Get-ChildItem -LiteralPath (Join-Path $Downloads ("Completed\we {0}.{1}" -f $sun.Month, $sun.Day)) -Filter '*payroll-journal*.csv' -ErrorAction SilentlyContinue
    # one missing-file card per day
    $mark = Join-Path $Base ("missing-{0:yyyyMMdd}.txt" -f (Get-Date))
    if (-not $ran -and -not $filed -and -not (Test-Path $mark)) {
      Set-Content -Encoding utf8 $mark (Get-Date -Format s)
      & $Notify -Title 'Danny & Coops Payroll: journal file not in yet' -Lines @("No payroll-journal CSV in Downloads as of $(Get-Date -Format 'ddd M/d h:mm tt'). The entry posts on its own once the file is dropped there.")
    }
  }
  exit 0
}

foreach ($f in $found) {
  $row = Import-Csv -LiteralPath $f.FullName | Where-Object { $_.'Period End' } | Select-Object -First 1
  if (-not $row) { continue }
  $end = [datetime]::ParseExact($row.'Period End', 'yyyy-MM-dd', $null)
  $weFull = '{0}/{1}/{2}' -f $end.Month, $end.Day, $end.Year
  $run = Join-Path $Base ("wk{0:MMdd}" -f $end)
  New-Item -ItemType Directory -Force $run | Out-Null
  $done = Join-Path $run 'done.txt'
  if ((Test-Path $done) -and -not $Force) { continue }
  $log = Join-Path $run 'payroll-run.log'
  function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
  $title = "Danny & Coops Payroll, W.E. $weFull"

  # the Downloads path carries an apostrophe that MSYS path conversion mangles
  Copy-Item -LiteralPath $f.FullName (Join-Path $run $f.Name) -Force
  $result = Join-Path $run 'result.json'
  if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
  Log "starting claude ($Mode) on $($f.FullName)"
  $prompt = @"
/danny-coops-payroll Unattended run for the week ending $weFull. Follow the skill's Unattended run section.
Work directory: $run
Journal copy: $(Join-Path $run $f.Name)
Original file: $($f.FullName)
"@
  Set-Location $Repo
  # 5.1 turns native stderr into errors; Stop would kill the run
  $ErrorActionPreference = 'Continue'
  & $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
  Log "claude exited $LASTEXITCODE"
  # backstop for a run that died before closing; the session binds to the work directory
  Set-Location $run
  & playwright-cli -s=dcpu close 2>&1 | Out-Null
  $ErrorActionPreference = 'Stop'
  Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

  if (-not (Test-Path $result)) {
    & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
    continue
  }
  & $Notify -Title $title -ResultFile $result
}
