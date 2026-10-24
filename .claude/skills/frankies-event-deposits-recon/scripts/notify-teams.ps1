# Post a card to the Event Sales Entry Teams Workflows webhook in ~/.claude/frankies-event-deposits.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\frankies-event-deposits.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $Lines = @()
  foreach ($w in @($r.weeks)) {
    $Lines += "**Week ending $($w.weekEnding)**: $($w.status); tab 2015 $('{0:N2}' -f [double]$w.tab2015), 1242 $('{0:N2}' -f [double]$w.tab1242) | GL 2015 $('{0:N2}' -f [double]$w.gl2015), 1242 $('{0:N2}' -f [double]$w.gl1242)"
    foreach ($c in @($w.changes)) { if ($c) { $Lines += "- $c" } }
    if ($w.status -notin 'ties', 'unchanged', 'rebuilt') { $attention = $true }
  }
  foreach ($k in 'recodes', 'issues', 'openItems') {
    $L = @($r.$k | Where-Object { $_ })
    if ($L.Count) {
      $Lines += "**$(@{recodes='Recodes';issues='Issues';openItems='Open items'}[$k])**"
      $Lines += @($L | ForEach-Object { "- $_" })
      if ($k -eq 'issues') { $attention = $true }
    }
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
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
