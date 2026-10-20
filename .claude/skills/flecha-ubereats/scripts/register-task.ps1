# One-time setup: Tuesdays at 16:00 from 10/13/2026, only while signed in. A missed run starts once the machine is available.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At ([datetime]'2026-10-13T16:00:00')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Flecha Weekly Uber Eats' -Action $action -Trigger $trigger -Settings $settings -Description 'Trues up the prior Flecha Uber Eats week, estimates the week that ended Sunday, then reports to the Flecha TPD Teams channel.' -Force
