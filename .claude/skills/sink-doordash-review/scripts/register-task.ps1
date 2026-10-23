# One-time setup: Fridays at 10:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'friday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 10:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Sink DoorDash Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Reviews The Sink 13562 against DoorDash through the week that ended Sunday, corrects and posts entries, then reports to Teams.' -Force
