# Post a card to the Teams Workflows webhook in ~/.claude/sink-doordash.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\sink-doordash.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ties = @($r.weeks | Where-Object { $_.status -eq 'ties' }).Count
  $Lines = @("$ties of $(@($r.weeks).Count) ended weeks tie; 13562 at $($r.lastEnd): $('{0:N2}' -f [double]$r.balance), unpaid $('{0:N2}' -f [double]$r.unpaid)")
  foreach ($p in $r.weeks) {
    if ($p.action -and $p.action -ne 'none') { $Lines += "- $($p.num): $($p.action), $('{0:N2}' -f [double]$p.amount)" }
    if ($p.status -ne 'ties') { $Lines += "- $($p.num): $($p.status)"; $attention = $true }
    foreach ($w in @($p.warnings)) { if ($w) { $Lines += "- $($p.num): $w"; $attention = $true } }
  }
  if ($r.note) { $Lines += $r.note; $attention = $true }
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
if ($DryRun) { $json; return }
if (-not $cfg.teamsWebhook) { throw "no teamsWebhook in ~/.claude/sink-doordash.json" }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
