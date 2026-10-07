# Post a card to the Teams Workflows webhook in ~/.claude/bowery-grubhub.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-grubhub.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $Lines = foreach ($e in $r.entries) {
    $ok = @($e.stores | Where-Object { $_.status -eq 'approved' })
    $sum = ($ok | Measure-Object -Property amount -Sum).Sum
    "**$($e.date)** (sales $($e.window)): $($ok.Count) approved, $('{0:N2}' -f [double]$sum)"
    foreach ($s in $e.stores) {
      if ($s.status -ne 'approved') { "- $($s.store): $($s.status)$(if ($s.amount) { ', ' + ('{0:N2}' -f [double]$s.amount) })" }
      foreach ($w in @($s.warnings)) { if ($w) { "- $($s.store): $w" } }
      if ($s.status -notin 'approved', 'skipped', 'no-deposit' -or @($s.warnings | Where-Object { $_ }).Count) { $attention = $true }
    }
  }
  if ($r.note) { $Lines += $r.note }
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($cfg.mention -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = "$at please review."; wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
