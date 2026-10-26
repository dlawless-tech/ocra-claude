# One-time setup: every 15 min Mon-Tue 7:00-18:00 and Wed 7:00-8:30, only while signed in.
$script = Join-Path $PSScriptRoot 'weekly-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
function Every15($days, $hours) {
  $t = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $days -At 7:00
  $t.Repetition = (New-ScheduledTaskTrigger -Once -At 7:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Minutes ($hours * 60))).Repetition
  $t
}
$trigger = @((Every15 @('Monday', 'Tuesday') 11), (Every15 'Wednesday' 1.5))
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Weekly Change Orders' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS Change Orders entry once the week''s Change Order Report is in the folder (Mon-Tue), reports a missing report Wed 8:00, then reports to Teams.' -Force
