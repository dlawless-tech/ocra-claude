# One-time setup, only while signed in. Daily 6:00 AM; vandypay-run.ps1 exits quietly before the 4th
# and once the month just ended is done, so the run lands on the 4th or the first day after it the PC is on.
$script = Join-Path $PSScriptRoot 'vandypay-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
Register-ScheduledTask -TaskName 'Bowery VandyPay Fees' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) -Trigger (New-ScheduledTaskTrigger -Daily -At 06:00) -Settings $settings -Description 'On the 4th of each month, posts and approves the Cookshop VandyPay Fees entry for the month just ended (104-07 to 632-00) from the UGRYD statement, then posts the confirmation to Teams.' -Force
