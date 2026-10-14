# One-time setup: Tuesdays at 15:15 from 10/20/2026. Only while signed in.
# A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$weekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At ([datetime]'2026-10-20T15:15')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'FARE Uber Eats - Tuesday' -Action $action -Trigger $weekly -Settings $settings -Description 'Posts, backs up and approves the FARE Uber Eats entries for the Monday to Sunday week that ended two days before, then reports to Teams, tagging Tricia. Tags Tricia when Uber mails a login code.' -Force
