# One-time setup: Tuesdays at 18:45 from 10/13/2026, only while signed in. A missed run starts once the machine is available.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At ([datetime]'2026-10-13T18:45:00')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Flecha GrubHub Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Trues up last period''s Flecha GrubHub fee estimates and estimates the Tue-Mon period that ended Monday, then reports to Teams.' -Force
