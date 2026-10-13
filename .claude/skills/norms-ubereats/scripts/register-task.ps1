# One-time setup: Mondays at 17:00 from 10/19/2026, plus a one-off catch-up Tue 10/13/2026 09:00. Only while signed in.
# A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$weekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At ([datetime]'2026-10-19T17:00')
$catchUp = New-ScheduledTaskTrigger -Once -At ([datetime]'2026-10-13T09:00')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Uber Eats Weekly' -Action $action -Trigger @($weekly, $catchUp) -Settings $settings -Description 'Posts the NORMS Uber Eats entries for the pay period that ended the Sunday before, then reports to Teams.' -Force
