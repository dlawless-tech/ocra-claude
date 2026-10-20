# One-time setup, only while signed in. Thu 4:30 PM-11:50 PM every 10 minutes: pulls the Net Pay Reports once the Payroll GL is in.
$script = Join-Path $PSScriptRoot 'netpay-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$watch = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 16:30
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 16:30 -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Hours 7 -Minutes 25)).Repetition
Register-ScheduledTask -TaskName 'Bowery Wkly Payroll Report' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) -Trigger $watch -Settings $settings -Description 'Thursdays 4:30 PM to 11:50 PM every 10 minutes: once the Payroll GL is in the Bowery Payroll folder, saves each location''s Paycor Net Pay Reports next to it for the payroll run. Teams card to Tricia only on a problem.' -Force
