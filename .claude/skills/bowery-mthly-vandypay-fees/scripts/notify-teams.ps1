# Post a card to the Teams Workflows webhook in ~/.claude/bowery-vandypay.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-vandypay.json" | ConvertFrom-Json

# a plain -Lines message always needs a look
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = $r.status -eq 'approved'
  $Lines = @($(if ($ok) { "**Done.** $($r.month) VandyPay Fees approved at Cookshop, Dr 632-00 / Cr 104-07." } else { "**VandyPay Fees run $($r.status)**" }))
  if ($r.comment) { $Lines += "Comment: $($r.comment)" }
  if ($r.attachment) { $Lines += "Attached: $($r.attachment)" }
  foreach ($a in @($r.programFees)) { if ($a) { $Lines += "- Non-transaction adjustment $('{0:N2}' -f [double]$a.amount) ($($a.note)) settles by its own ACH$(if ($a.achDate) { " on $($a.achDate)" }); code that bank line to 104-07 at Cookshop." } }
  foreach ($x in @($r.warnings)) { if ($x) { $Lines += "- $x" } }
  if ($r.note) { $Lines += $r.note }
  $attention = -not $ok -or @($r.warnings | Where-Object { $_ }).Count -gt 0
  $facts = @(@{ title = 'Amount'; value = '{0:N2}' -f [double]$r.amount }, @{ title = 'Date'; value = "$($r.date)" }, @{ title = 'Status'; value = "$($r.status)" })
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($facts.Count) { $content.body += @{ type = 'FactSet'; facts = $facts; spacing = 'Medium' } }
if ($cfg.mention -and $cfg.mention.email -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = $(if ($attention) { "$at please review." } else { "$at VandyPay Fees is complete." }); wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
