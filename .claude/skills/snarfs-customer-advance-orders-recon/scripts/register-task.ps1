# One-time setup: Fridays at 11:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'friday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 11:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 5) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Snarfs Customer Advance Orders Weekly" -Action $action -Trigger $trigger -Settings $settings -Description "Reconciles Snarf's 20100 Customer Advance Orders to Toast through Thursday, then reports to the TPD Teams channel." -Force
