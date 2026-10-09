# One-time setup, only while signed in. One task, three starts:
#   on demand: payroll-run.ps1 starts it after filing a week
#   Thursday 7:00 PM and Friday 9:00 AM: backstops for a payroll filed by hand
# pe-tips-run.ps1 exits quietly unless last Sunday ended a fiscal period.
$script = Join-Path $PSScriptRoot 'pe-tips-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$triggers = @(
  (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 19:00),
  (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 09:00)
)
Register-ScheduledTask -TaskName 'Bowery PE Tips Recon' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) -Trigger $triggers -Settings $settings -Description 'After the last Bowery payroll of a fiscal period is filed, posts and approves one entry per store zeroing 210-00 Tips Payable to 632-00, then posts the confirmation to Teams. Started by the payroll run; Thursday 7 PM and Friday 9 AM backstops.' -Force
