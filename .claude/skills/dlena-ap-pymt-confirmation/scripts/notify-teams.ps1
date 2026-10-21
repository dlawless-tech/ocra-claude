# Post a card to the dLena Teams webhook in ~/.claude/dlena-stripe-deposits.json.
# Tags the mention on every card except a clean result. A -Lines card is a failure.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json> [-Moved <text>]) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [string]$Moved, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\dlena-stripe-deposits.json" | ConvertFrom-Json
function N($x) { '{0:N2}' -f [double]$x }

$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $Lines = @()
  foreach ($v in $r.vendors) {
    $Lines += switch ($v.status) {
      'paid' { "- $($v.vendor): $($v.payment) ACH $(N $v.amount), $($v.invoices) invoices, stub $(if ($v.attached) { 'attached' } else { 'NOT attached' }), email $(if ($v.emailed) { 'sent' } else { 'NOT sent' })" }
      'none' { "- $($v.vendor): nothing approved to pay" }
      default { "- $($v.vendor): $($v.status)" }
    }
    if ($v.reason) { $Lines += "  $($v.reason)" }
    if ($v.status -ne 'none' -and -not ($v.status -eq 'paid' -and $v.attached -and $v.emailed)) { $attention = $true }
    foreach ($u in @($v.unapproved)) { if ($u) { $Lines += "  Unapproved, left open: $($u.invoice) $(N $u.amount)$(if ($u.comment) { ', ' + $u.comment })" } }
  }
  if (@($r.vendors).Count -ne 2) { $attention = $true }
  if ($r.note) { $Lines += $r.note; $attention = $true }
  $Lines += if ($Moved) { $Moved } else { 'AP Aging left in Downloads.' }
}
if ($attention -and $Title -notmatch 'FAILED|waiting|TEST') { $Title = "$Title NEEDS REVIEW" }

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($attention -and $cfg.mention -and $cfg.mention.email) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = "$at please review."; wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
