# Task Scheduler entry point, Fridays 7:00 with a 13:00 retry. Posts every closed Foodja statement period not yet done, oldest first.
# usage: friday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# Periods run Monday to Sunday, two weeks, closing every other Sunday from 9/27/2026. A period is due from the Friday after it closes.
# A period with no statements yet waits: silent at 7:00, a Teams card at 13:00, and it comes up again next Friday.
# -Date stands in for today. -Force reruns a period already marked done.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Anchor = [datetime]'2026-09-27'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$late = (Get-Date).Hour -ge 13
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }

$ends = @(); $e = $Anchor
while ($e.AddDays(5) -le $today) { $ends += $e; $e = $e.AddDays(14) }

foreach ($end in $ends) {
  $start = $end.AddDays(-13)
  $run = Join-Path $Repo (".scratch\norms-foodja-fees\p{0:MMdd}" -f $end)
  $done = Join-Path $run 'done.txt'
  if ((Test-Path $done) -and -not $Force) { continue }
  New-Item -ItemType Directory -Force $run | Out-Null
  $log = Join-Path $run 'friday-run.log'
  function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
  $result = Join-Path $run 'result.json'
  Remove-Item -ErrorAction SilentlyContinue $result
  Log "period $(D $start) - $(D $end); starting claude"

  $prompt = @"
/norms-foodja-fees Unattended run for the Foodja statement period $(D $start) to $(D $end). Follow the skill's Unattended run section.
Work directory: $run
Entry date: $(D $end)
"@
  Set-Location $Repo
  # 5.1 turns native stderr into errors; Stop would kill the run
  $ErrorActionPreference = 'Continue'
  & $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
  Log "claude exited $LASTEXITCODE"
  # backstop for a run that died before closing its sessions; sessions bind to the work dir
  Set-Location $run
  foreach ($s in 'nfju', 'nfru', 'nfrbu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }
  $ErrorActionPreference = 'Stop'

  $title = "NORMS Foodja Fees, period $(D $start) - $(D $end)"
  $r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }
  if (-not $r) {
    & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
    continue
  }
  if (@($r.stores).Count -eq 0 -and $r.note -match 'no statements') {
    Log 'no statements posted yet'
    if ($late) { & $Notify -Title "$title waiting" -Lines @("Foodja has not posted statements for this period yet. The next Friday run tries again.") }
    continue
  }
  Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
  & $Notify -Title $title -ResultFile $result
}
