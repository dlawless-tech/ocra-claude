# One-time setup: Sundays at 6:30, only while signed in; a missed run starts at next sign-in.
$script = Join-Path $PSScriptRoot 'sunday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 6:30
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Danny & Coops Bank Downloads - Sunday' -Action $action -Trigger $trigger -Settings $settings -Description 'Retrieves the week of bank activity for every connected Danny & Coops account and posts the result to the Bank Activity channel, tagging Layla only on a problem.' -Force
