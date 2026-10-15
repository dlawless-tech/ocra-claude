# One-time setup: Wednesdays at 13:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'wednesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 13:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Snarfs Grubhub Weekly" -Action $action -Trigger $trigger -Settings $settings -Description "Posts the Snarf's Grubhub entries for the period that ended Monday, then reports to Teams." -Force
