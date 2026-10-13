# Post a card to the Teams Workflows webhook in ~/.claude/norms-stripe-deposits.json, always tagging the mention.
# -Code tags codeMention instead, asking for the Stripe sign-in code.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-Code] [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$Code, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\norms-stripe-deposits.json" | ConvertFrom-Json
function N($x) { '{0:N2}' -f [double]$x }

# a plain -Lines message is always a failure
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $posted = @($r.payouts | Where-Object { $_.status -eq 'posted' })
  $Lines = @("**$($posted.Count) of $(@($r.payouts).Count) payouts posted**, total $(N (($posted | Measure-Object -Property amount -Sum).Sum))")
  foreach ($p in $r.payouts) {
    $kind = if ($p.stream -eq 'gc') { 'Gift card' } else { 'In Kind' }
    $Lines += "- $($p.bankDate) $kind $(N $p.amount): $($p.status)$(if ($p.deposit) { ', ' + $p.deposit })$(if ($p.reason) { ', ' + $p.reason })"
    if ($p.status -ne 'posted') { $attention = $true }
  }
  if (-not @($r.payouts).Count) { $Lines = @('No unmatched Stripe lines on 1020.') }
  foreach ($w in @($r.waiting)) { if ($w) { $Lines += "Paid in Stripe, no bank line yet: $($w.arrival) $(N $w.amount)" } }
  if ($r.note) { $Lines += $r.note; $attention = $true }
}
if ($attention -and -not $Code -and $Title -notmatch 'FAILED|waiting|TEST') { $Title = "$Title NEEDS REVIEW" }

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
$who = if ($Code) { $cfg.codeMention } else { $cfg.mention }
if ($who -and $who.email) {
  $at = "<at>$($who.name)</at>"
  $ask = if ($Code) { "$at Stripe texted a sign-in code to the phone ending 3281. Type it into the open Stripe window." } elseif ($attention) { "$at please review." } else { "$at FYI." }
  $content.body += @{ type = 'TextBlock'; text = $ask; wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $who.email; name = $who.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
