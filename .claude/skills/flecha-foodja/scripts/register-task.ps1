# One-time setup: Tuesdays at 16:00 from 11/3/2026, only while signed in. A missed run starts once the machine is available.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At ([datetime]'2026-11-03T16:00:00')
# no UTC offset, so the run keeps its local time across daylight saving
$trigger.StartBoundary = '2026-11-03T16:00:00'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Flecha Weekly Foodja' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Flecha Foodja fees for the week that ended Sunday, then reports to the Flecha TPD Teams channel.' -Force
