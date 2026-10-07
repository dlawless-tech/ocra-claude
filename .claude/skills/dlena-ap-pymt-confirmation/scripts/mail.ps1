param([Parameter(Mandatory)][string]$Tag, [Parameter(Mandatory)][string]$MD, [Parameter(Mandatory)][string]$Attach, [switch]$Send)
# Payment email for one vendor, copied from the newest sent "dLena Weekly <Tag> Payment ..." email:
# same To/Cc, default signature, subject and attachment for this week. Saves a draft unless -Send.
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace("MAPI")
$subject = "dLena Weekly $Tag Payment $MD"
$sent = $ns.GetDefaultFolder(5).Items; $sent.Sort("[SentOn]", $true)
$orig = $null
foreach ($m in $sent) {
  if ($m.Subject -eq $subject) { "FAIL: '$subject' already sent $($m.SentOn)"; exit 1 }
  if ($m.Subject -like "dLena Weekly $Tag Payment *") { $orig = $m; break }
}
if (-not $orig) { "FAIL: no earlier sent 'dLena Weekly $Tag Payment' email"; exit 1 }
if (-not (Test-Path -LiteralPath $Attach)) { "FAIL: no file $Attach"; exit 1 }
$dupes = @($ns.GetDefaultFolder(16).Items | Where-Object { $_.Subject -eq $subject })
if ($dupes.Count) { "FAIL: $($dupes.Count) draft(s) '$subject' already in Drafts"; exit 1 }

$greeting = if ((Get-Date).Hour -lt 12) { "Good morning," } else { "Good afternoon," }
$new = $ol.CreateItem(0)
$null = $new.GetInspector   # loads the default signature into HTMLBody
foreach ($r in $orig.Recipients) {
  $addr = $r.Address
  if ($r.AddressEntry.Type -eq "EX") { $addr = $r.AddressEntry.GetExchangeUser().PrimarySmtpAddress }
  $nr = $new.Recipients.Add($addr); $nr.Type = $r.Type
}
if (-not $new.Recipients.ResolveAll()) { "FAIL: a recipient did not resolve"; exit 1 }
$new.Subject = $subject
$intro = "<p class=MsoNormal>$greeting</p><p class=MsoNormal>&nbsp;</p><p class=MsoNormal>Attached please find the weekly payment detail for dLena to be applied to the listed invoices.</p><p class=MsoNormal>&nbsp;</p>"
$new.HTMLBody = $new.HTMLBody -replace '(<body[^>]*>(\s*<div[^>]*>)?)', "`$1$intro"
$null = $new.Attachments.Add($Attach)

"subject: $subject   (copied from: $($orig.Subject), $($orig.SentOn))"
"recipients: " + (($new.Recipients | ForEach-Object { "$(@('','To','Cc','Bcc')[$_.Type]):$($_.Name)" }) -join "; ")
"attachments: " + (($new.Attachments | Where-Object { $_.FileName -notlike 'image*' } | ForEach-Object { $_.FileName }) -join ", ")
"body: " + ((($new.Body -split "`r?`n" | Where-Object { $_.Trim() }) | Select-Object -First 2) -join " | ")
if ($Send) { $new.Send(); "SENT $subject" } else { $new.Save(); $new.Display(); "DRAFT $subject (open in Outlook)" }
