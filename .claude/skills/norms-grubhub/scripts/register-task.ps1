# One-time setup: Tuesdays at 23:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 23:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Grubhub Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS Grubhub entries for the period that ended eight days earlier, then reports to Teams.' -Force
