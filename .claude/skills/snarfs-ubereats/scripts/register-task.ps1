# One-time setup: Tuesdays 13:00, only while signed in.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 13:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Snarfs Uber Eats Weekly" -Action $action -Trigger $trigger -Settings $settings -Description "Posts the Snarf's Uber Eats entries for the Mon-Sun week ended the Sunday before, then reports to the TPD Teams channel." -Force
