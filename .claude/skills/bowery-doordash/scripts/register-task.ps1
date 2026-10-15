# One-time setup: Thursdays every 2 hours from 10:00 to 18:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = @(10, 12, 14, 16, 18 | ForEach-Object { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At ('{0}:00' -f $_) })
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Bowery DoorDash Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Bowery DoorDash entries for the Mon-Sun period paid that Thursday, then reports to Teams.' -Force
