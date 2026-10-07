# Post a card to the Teams Workflows webhook in ~/.claude/norms-change-orders.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\norms-change-orders.json" | ConvertFrom-Json

# a plain -Lines message is always a failure or a miss
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $l = "**$($r.number)**: $($r.status)"
  if ($r.amount) { $l += ", $('{0:N2}' -f [double]$r.amount), $($r.lines) lines across $($r.stores) stores" }
  $Lines = @($l)
  if ($r.status -in 'approved', 'posted-unapproved') {
    $Lines += "Report attached $(if ($r.attached) {'yes'} else {'no'}), filed to Completed $(if ($r.filed) {'yes'} else {'no'})"
  }
  foreach ($w in @($r.warnings)) { if ($w) { "- $w" | ForEach-Object { $Lines += $_ } } }
  if ($r.note) { $Lines += $r.note }
  if ($r.status -notin 'approved', 'skipped' -or @($r.warnings | Where-Object { $_ }).Count) { $attention = $true }
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
