# One-time setup: Sundays at 7:00, only while signed in; a missed run starts at next sign-in.
$script = Join-Path $PSScriptRoot 'sunday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 7:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Bowery Bank Downloads - Sunday' -Action $action -Trigger $trigger -Settings $settings -Description 'Retrieves the week of bank activity for every connected Bowery account and posts the result to the Bank Activity channel.' -Force
