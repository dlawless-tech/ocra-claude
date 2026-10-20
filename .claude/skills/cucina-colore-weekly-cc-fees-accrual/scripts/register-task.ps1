# One-time setup: Tuesdays at 10:00 from 10/27/2026, only while signed in.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At ([datetime]'2026-10-27 10:00')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Cucina Colore Weekly CC Fee Accrual' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Cucina Colore Credit Card Fees entry for the week that ended Sunday, then reports to Teams.' -Force
