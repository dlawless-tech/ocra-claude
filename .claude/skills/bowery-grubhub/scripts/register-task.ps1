# One-time setup: Tuesdays at 22:30, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 22:30
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Bowery Grubhub Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Bowery Grubhub entries for the period that ended eight days earlier, then reports to Teams.' -Force
