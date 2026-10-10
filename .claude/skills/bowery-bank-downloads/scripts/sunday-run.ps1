# Task Scheduler entry point. Retrieves every account for the prior Sunday through Saturday, then posts the result to Teams.
# usage: sunday-run.ps1 [-Force]
# Writes one marker per week so a second trigger does nothing.
param([switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = Resolve-Path "$PSScriptRoot\..\..\..\.."
$Bash = 'C:\Program Files\Git\bin\bash.exe'
$Skills = (Resolve-Path "$PSScriptRoot\..\..").Path -replace '\\', '/'
$Notify = "$PSScriptRoot\notify-teams.ps1"
$S = 'bbk'

$today = (Get-Date).Date
# prior week, Sunday through Saturday; folder named for the run's Sunday, which Tripleseat Pay reads
$sun = $today.AddDays(-[int]$today.DayOfWeek)
$start = $sun.AddDays(-7); $end = $sun.AddDays(-1)
$fmt = { param($d) '{0}/{1}/{2}' -f $d.Month, $d.Day, $d.Year }
$startS = & $fmt $start; $endS = & $fmt $end
$run = Join-Path $Repo (".scratch\bowery-bank-downloads\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'sunday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Remove-Item -ErrorAction SilentlyContinue (Join-Path $run 'retrieve.log')

# sessions bind to the work dir
Set-Location $run
$ErrorActionPreference = 'Continue'
$runPosix = $run -replace '\\', '/'
function Sh($cmd) { $o = & $Bash -lc "cd '$runPosix' && $cmd" 2>&1 | Out-String; Log $o.Trim(); $o }

# FAIL stops retrieve-all; log back in and resume from that account, three tries
$from = 1
for ($try = 1; $try -le 3; $try++) {
  Sh "bash '$Skills/bowery-ubereats/scripts/r365-login.sh' $S && bash '$Skills/bowery-bank-downloads/scripts/open-bank-activity.sh' $S" | Out-Null
  Sh "bash '$Skills/bowery-bank-downloads/scripts/retrieve-all.sh' $S $startS $endS $from" | Out-Null
  $last = @(Get-Content -Encoding utf8 (Join-Path $run 'retrieve.log') -ErrorAction SilentlyContinue)[-1]
  if ($last -match '^\d+ END') { break }
  if ($last -match '^(\d+) FAIL') { $from = [int]$Matches[1] }
}
Sh "playwright-cli -s=$S close" | Out-Null

$lines = @(Get-Content -Encoding utf8 (Join-Path $run 'retrieve.log') -ErrorAction SilentlyContinue)
& $Notify -Title "Bowery bank downloads $startS - $endS" -RetrieveLog $lines
# Tripleseat Pay waits on a complete download; its run checks retrieve.log itself
try { Start-ScheduledTask -TaskName 'Bowery Tripleseat Pay - After Bank Downloads' } catch { Log "tripleseat task not started: $_" }
