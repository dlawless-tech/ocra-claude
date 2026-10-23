# One-time setup: Thursdays at 10:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 10:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Sink Grubhub Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Reviews The Sink 13580 against Grubhub through the period that ended Monday, corrects and posts entries, then reports to Teams.' -Force
