# Delete one tab of the workbook, or with -Rename, delete it and give another tab its name.
# usage: drop-tab.ps1 -File <xlsx> -Name <tab> [-Rename <tab taking its name>]
param([string]$File,[string]$Name,[string]$Rename)
$ErrorActionPreference='Stop'
$xl = New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
try {
 $wb = $xl.Workbooks.Open($File)
 $wb.Worksheets.Item($Name).Delete()
 if($Rename){ $wb.Worksheets.Item($Rename).Name = $Name }
 $wb.Save(); (@($wb.Worksheets | Select-Object -First 5 | ForEach-Object { $_.Name }) -join ' | '); $wb.Close($false)
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
