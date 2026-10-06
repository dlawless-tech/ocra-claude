# Post a card to the Teams Workflows webhook in ~/.claude/bowery-cash-log.json ({"teamsWebhook": "<url>"}).
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-cash-log.json" | ConvertFrom-Json

# a plain -Lines message is always a failure or a miss
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $Lines = foreach ($s in $r.stores) {
    $l = "**$($s.store)**: $($s.status), $('{0:N2}' -f [double]$s.amount)"
    if ($s.transactionId) { $l += ", id $($s.transactionId)" }
    $l += "; PDF attached $(if ($s.attached) {'yes'} else {'no'}), filed $(if ($s.filed) {'yes'} else {'no'})"
    $l
    foreach ($c in @($s.checks)) { if ($c) { "- $($s.store) check $($c.number) $('{0:N2}' -f [double]$c.amount), $($c.paidTo): $($c.status)" } }
    foreach ($w in @($s.warnings)) { if ($w) { "- $($s.store): $w" } }
  }
  if ($r.note) { $Lines += $r.note }
  foreach ($s in $r.stores) {
    if ($s.status -notin 'approved', 'skipped' -or @($s.warnings | Where-Object { $_ }).Count) { $attention = $true }
    foreach ($c in @($s.checks)) { if ($c -and ($c.status -notin 'approved', 'skipped' -or $c.paidTo -like 'paid to*')) { $attention = $true } }
  }
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
