# Post a card to the Teams Workflows webhook in ~/.claude/bowery-mgmt-fees-ic.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -MfFile <mf-result.json> -IcFile <ic-result.json> -Filed -FileNote <s> -Log <path> -Workbook <name>)
param([string]$Title, [string[]]$Lines = @(), [string]$MfFile, [string]$IcFile, [switch]$Filed, [string]$FileNote, [string]$Log, [string]$Workbook)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-mgmt-fees-ic.json" | ConvertFrom-Json
$n = { param($v) '{0:N2}' -f [double]$v }

# a plain -Lines message always needs a look
$attention = $true
if ($Workbook) {
  $attention = $false
  $mf = if ($MfFile) { Get-Content -Raw -Encoding utf8 $MfFile | ConvertFrom-Json }
  $ic = if ($IcFile) { Get-Content -Raw -Encoding utf8 $IcFile | ConvertFrom-Json }

  if (-not $mf) { $Lines += '**Management Fees run ended without a result.** Nothing was confirmed posted.'; $attention = $true }
  elseif ($mf.status -eq 'approved') { $Lines += "Management Fees entry **approved** at $(& $n $mf.total)" }
  else { $Lines += "**Management Fees entry $($mf.status)**"; $attention = $true }
  if ($mf -and $mf.note) { $Lines += $mf.note }

  if (-not $ic) { $Lines += '**Intercompany Transfers run ended without a result.** Nothing was confirmed posted.'; $attention = $true }
  else {
    if ($ic.status -eq 'approved') { $Lines += 'Intercompany Transfers **approved**:' } else { $Lines += "**Intercompany Transfers $($ic.status)**"; $attention = $true }
    foreach ($e in @($ic.entries)) { if ($e) { $Lines += "- $($e.number): $($e.status) at $(& $n $e.total)" } }
    foreach ($t in @($ic.transfers)) { if ($t) { $Lines += "- $($t.from) -> $($t.to): $(& $n $t.amount)" } }
    foreach ($x in @($ic.flipped)) { if ($x) { $Lines += "- Direction flipped from last week: $x" } }
    if ($ic.note) { $Lines += $ic.note }
  }

  $att = ($mf -and $mf.attached) -and ($ic -and $ic.attached)
  $Lines += "Workbook attached to both: $(if ($att) { 'yes' } else { '**no**' }); moved to Completed: $(if ($Filed) { 'yes' } else { '**no**' })"
  if ($FileNote) { $Lines += $FileNote }
  foreach ($x in @($mf.warnings) + @($ic.warnings)) { if ($x) { $Lines += "- $x"; $attention = $true } }
  if (-not $Filed) { $attention = $true; if ($Log) { $Lines += "$Workbook stays in the folder. Log: $Log" } }
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($cfg.mention -and $cfg.mention.email -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = $(if ($attention) { "$at please review." } else { "$at both entries posted and approved." }); wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
