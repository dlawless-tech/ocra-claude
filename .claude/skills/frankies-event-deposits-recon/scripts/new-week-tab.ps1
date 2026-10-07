# Copy one tab of the workbook to a new tab placed right before it (newest week first).
# usage: new-week-tab.ps1 -File <xlsx> -From <tab> -Name <new tab> [-After <tab>]  (default: right before -From)
param([string]$File,[string]$From,[string]$Name,[string]$After)
$ErrorActionPreference='Stop'
$xl = New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
try {
 $wb = $xl.Workbooks.Open($File)
 foreach($s in $wb.Worksheets){ if($s.Name -eq $Name){ throw "tab $Name already exists" } }
 $src = $wb.Worksheets.Item($From)
 if($After){ $at = $wb.Worksheets.Item($After); $src.Copy([Type]::Missing, $at); $new = $wb.Worksheets.Item($at.Index + 1) }
 else { $idx = $src.Index; $src.Copy($src); $new = $wb.Worksheets.Item($idx) }
 $new.Name = $Name
 $wb.Save(); (@($wb.Worksheets | ForEach-Object { $_.Name }) -join ' | '); $wb.Close($false)
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
