# One-time setup: Mondays at 22:00 from 10/19/2026, only while signed in. A missed run starts once the machine is available.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At ([datetime]'2026-10-19T22:00:00')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Flecha Weekly Mgmt Fees' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Flecha MGMT Fees entry for the week that ended Sunday at 7% of net sales, then reports to Teams.' -Force
