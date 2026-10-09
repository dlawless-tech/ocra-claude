# Post a card to the Teams Workflows webhook in ~/.claude/bowery-pe-tips.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-pe-tips.json" | ConvertFrom-Json

# a plain -Lines message always needs a look
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = $r.status -eq 'approved'
  $ents = @($r.entries)
  $Lines = @($(if ($ok) { "**Done.** 210-00 Tips Payable is zero at every store for $($r.period) ($($r.start) - $($r.end))." } else { "**Tips Payable run $($r.status)**" }))
  foreach ($e in $ents) {
    $Lines += "- $($e.location): $($e.status), $('{0:N2}' -f [double]$e.amount) $(if ($e.side -eq 'debit') { 'Dr 632-00 / Cr 210-00' } else { 'Dr 210-00 / Cr 632-00' })"
  }
  foreach ($s in @($r.skipped)) { if ($s) { $Lines += "- $($s.location): no entry, $($s.reason)" } }
  $Lines += "Balance after: $(if ($r.zeroAfter) { 'zero at every store' } else { '**not zero, see warnings**' })"
  foreach ($x in @($r.warnings)) { if ($x) { $Lines += "- $x" } }
  if ($r.note) { $Lines += $r.note }
  $attention = -not $ok -or -not $r.zeroAfter -or @($r.warnings | Where-Object { $_ }).Count -gt 0
  $facts = @(@{ title = 'Total'; value = '{0:N2}' -f [double]$r.total }, @{ title = 'Entries'; value = "$($ents.Count)" }, @{ title = 'Number'; value = "$($r.number)" })
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($facts.Count) { $content.body += @{ type = 'FactSet'; facts = $facts; spacing = 'Medium' } }
if ($cfg.mention -and $cfg.mention.email -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = $(if ($attention) { "$at please review." } else { "$at period-end Tips Payable is complete." }); wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
