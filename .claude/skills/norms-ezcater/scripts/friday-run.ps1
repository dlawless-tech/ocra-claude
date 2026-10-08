# Task Scheduler entry point, every other Friday 3:00 from 10/23/2026. Enters every closed two-week window not yet done, oldest first.
# usage: friday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# Windows run Sunday to Saturday, two weeks, ending every other Saturday from 10/17/2026. A window is due from the Friday after it ends.
# -Date stands in for today. -Force reruns a window already marked done.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Anchor = [datetime]'2026-10-17'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }

$ends = @(); $e = $Anchor
while ($e.AddDays(6) -le $today) { $ends += $e; $e = $e.AddDays(14) }

foreach ($end in $ends) {
  $start = $end.AddDays(-13)
  $run = Join-Path $Repo (".scratch\norms-ezcater\we{0:MMdd}" -f $end)
  $done = Join-Path $run 'done.txt'
  if ((Test-Path $done) -and -not $Force) { continue }
  New-Item -ItemType Directory -Force $run | Out-Null
  $log = Join-Path $run 'friday-run.log'
  function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
  $result = Join-Path $run 'result.json'
  Remove-Item -ErrorAction SilentlyContinue $result
  Log "window $(D $start) - $(D $end); starting claude"

  $prompt = @"
/norms-ezcater Unattended run for EZ Cater sales $(D $start) to $(D $end). Follow the skill's Unattended run section.
Work directory: $run
Entry date: $(D $end)
"@
  Set-Location $Repo
  # 5.1 turns native stderr into errors; Stop would kill the run
  $ErrorActionPreference = 'Continue'
  & $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
  Log "claude exited $LASTEXITCODE"
  $r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }
  # backstop for a run that died before closing its sessions; sessions bind to the work dir. A run waiting on a code keeps its EZ Cater window open.
  Set-Location $run
  $close = if ($r -and $r.note -match 'code') { 'nezru', 'nezbu' } else { 'nezu', 'nezru', 'nezbu' }
  foreach ($s in $close) { & playwright-cli "-s=$s" close 2>&1 | Out-Null }
  $ErrorActionPreference = 'Stop'

  $title = "NORMS EZ Cater Fees, sales $(D $start) - $(D $end)"
  if (-not $r) {
    & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
    continue
  }
  if ($r.note -match 'code') {
    & $Notify -Title "$title waiting on EZ Cater code" -Lines @($r.note, "Enter the code in the open EZ Cater window, then run friday-run.ps1 again")
    continue
  }
  Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
  & $Notify -Title $title -ResultFile $result
}
