# One-time setup: Fridays at 11:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'friday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 11:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Snarfs EZ Cater Weekly" -Action $action -Trigger $trigger -Settings $settings -Description "Enters the Snarf's EZ Cater Fees entries for the week ended the Sunday before, then reports to Teams." -Force
