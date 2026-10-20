# One-time setup, only while signed in. Tue noon to Wed 5:00 PM hourly: downloads last week's 7shifts payroll journal once it is submitted.
$script = Join-Path $PSScriptRoot 'import-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$watch = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 12:00
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 12:00 -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Hours 29 -Minutes 5)).Repetition
Register-ScheduledTask -TaskName 'Danny & Coops 7shifts Payroll Import File' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) -Trigger $watch -Settings $settings -Description 'Tuesday noon to Wednesday 5:00 PM hourly: once last week''s 7shifts payroll is submitted, saves its payroll journal CSV to the Danny & Coops Payroll folder and starts the payroll posting run. Teams card only on a problem.' -Force
