# Post a card to the Bank Activity channel webhook in ~/.claude/bowery-tripleseat.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-tripleseat.json" | ConvertFrom-Json

# a plain -Lines message always needs a look
$ok = $false
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = $r.status -eq 'complete' -and -not @($r.warnings | Where-Object { $_ }).Count
  $Title = if ($ok) { "$Title complete" } else { "$Title $($r.status.ToUpper())" }
  $Lines = @()
  foreach ($d in @($r.deposits)) {
    if (-not $d) { continue }
    $Lines += "- $($d.store) $($d.number) $($d.date): net $('{0:N2}' -f [double]$d.net), gross $('{0:N2}' -f [double]$d.gross), fees $('{0:N2}' -f [double]$d.fees), refunds $('{0:N2}' -f [double]$d.refunds), $($d.status)"
  }
  if (-not $Lines.Count) { $Lines += 'No Paysafe deposits to split this week.' }
  foreach ($x in @($r.pending)) { if ($x) { $Lines += "- Not in R365 yet, next week: $x" } }
  foreach ($x in @($r.warnings)) { if ($x) { $Lines += "- **$x**" } }
  if ($r.note) { $Lines += $r.note }
}

$at = "<at>$($cfg.mention.name)</at>"
$tail = if ($ok) { "$at Tripleseat Pay deposits are split and attached." } else { "$at please review." }
$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) +
    @(@{ type = 'TextBlock'; text = $tail; wrap = $true })
  msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) } }
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
