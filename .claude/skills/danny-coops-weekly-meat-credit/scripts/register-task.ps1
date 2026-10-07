# One-time setup: Wednesdays at 3:00, only while signed in. A missed run starts once the machine is available.
$script = Join-Path $PSScriptRoot 'wednesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 3:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Danny & Coops Weekly Meat Credit' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Danny & Coops Meat Credit Adj entry for the week that ended Sunday, rechecks the four weeks before, then reports to Teams.' -Force
