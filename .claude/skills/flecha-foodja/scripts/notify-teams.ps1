# Post a card to the Flecha TPD Teams Workflows webhook in ~/.claude/flecha-foodja.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\flecha-foodja.json" | ConvertFrom-Json
$m = { param($v) '{0:N2}' -f [double]$v }

# a plain -Lines message is always a failure
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  if ($r.status -eq 'done') {
    $Lines = @("**Completed:** Foodja W.E. $($r.weekEnding) posted and approved")
  } else {
    $Lines = @("**Foodja W.E. $($r.weekEnding) $($r.status)**")
    $attention = $true
  }
  # warnings and questions tag; notes are known open items and do not
  foreach ($x in @($r.warnings) + @($r.questions)) { if ($x) { $Lines += "- $x"; $attention = $true } }
  foreach ($x in @($r.notes)) { if ($x) { $Lines += "- $x" } }
  if ($r.note) { $Lines += $r.note }
  $facts = @($r.stores | ForEach-Object { @{ title = $_.store; value = "$(& $m $_.fee) on sales $(& $m $_.sales) at $('{0:P2}' -f [double]$_.rate)" } })
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($facts.Count) { $content.body += @{ type = 'FactSet'; facts = $facts; spacing = 'Medium' } }
# tag only on problems; a clean week posts untagged
$who = @($cfg.mentions | Where-Object { $_.email })
if ($who.Count -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $ats = @($who | ForEach-Object { "<at>$($_.name)</at>" })
  $content.body += @{ type = 'TextBlock'; text = "$($ats -join ' ') please review."; wrap = $true }
  $content.msteams = @{ entities = @($who | ForEach-Object { @{ type = 'mention'; text = "<at>$($_.name)</at>"; mentioned = @{ id = $_.email; name = $_.name } } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; exit 0 }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
