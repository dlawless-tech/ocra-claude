# One-time setup, only while signed in: Wednesdays hourly 12:30-18:30, Thursdays hourly 10:00-18:00
# and Friday 10:00, from 10/21/2026. A missed start runs when the machine is next available.
$script = Join-Path $PSScriptRoot 'weekly-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = @(12..18 | ForEach-Object { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At ([datetime]('2026-10-21 {0}:30' -f $_)) }) +
  @(10..18 | ForEach-Object { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At ([datetime]('2026-10-22 {0}:00' -f $_)) }) +
  @(New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At ([datetime]'2026-10-23 10:00'))
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Cucina Colore Weekly Tips' -Action $action -Trigger $trigger -Settings $settings -Description 'Once the week''s Cucina Colore Payroll entry is approved, sets the Tips entry to zero 25100 Employee Tips Payable, approves it, then reports to Teams.' -Force
