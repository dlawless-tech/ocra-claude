# One-time setup: Wednesdays at 18:45, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'wednesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 18:45
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Grubhub Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts or checks the NORMS Grubhub entries for the period that ended two days earlier, then reports to Teams.' -Force
