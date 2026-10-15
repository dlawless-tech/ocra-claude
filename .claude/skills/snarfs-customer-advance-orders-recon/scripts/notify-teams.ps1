# Post a card to the Snarf's TPD Teams channel, from ~/.claude/snarfs-advance-orders.json, tagging the mention.
# usage: notify-teams.ps1 -Title <t> [-Ask <request>] [-Code] (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
# -Code tags codeMention (the Toast sign-in contact) instead of mention.
param([string]$Title, [string]$Ask = 'please review.', [string[]]$Lines = @(), [string]$ResultFile, [switch]$Code, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\snarfs-advance-orders.json" | ConvertFrom-Json
if ($Code -and $cfg.codeMention) { $cfg.mention = $cfg.codeMention }
function N($v) { '{0:N2}' -f [double]$v }

if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $Lines = @("**20100 at $($r.end)**: GL $(N $r.glTotal), true balance (Toast) $(N $r.toastTotal), difference $(N $r.diffTotal)")
  foreach ($s in $r.stores) {
    $l = "- $($s.store): GL $(N $s.gl), Toast $(N $s.toast)"
    if ([math]::Abs([double]$s.diff) -ge 0.005) { $l += ", **difference $(N $s.diff)**" } else { $l += ', ties' }
    $Lines += $l
    foreach ($c in @($s.causes)) { if ($c) { $Lines += "  - $c" } }
  }
  if ($r.workbook) { $Lines += "Workbook: $($r.workbook)" }
  if ($r.note) { $Lines += $r.note }
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($cfg.mention) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = "$at $Ask"; wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; exit 0 }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
