# One-time setup: every other Friday at 3:00 from 10/23/2026, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'friday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 2 -DaysOfWeek Friday -At ([datetime]'2026-10-23 03:00')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS EZ Cater Fees' -Action $action -Trigger $trigger -Settings $settings -Description 'Enters the NORMS EZ Cater Fees entries for each closed two-week window, unapproved, then reports to Teams.' -Force
