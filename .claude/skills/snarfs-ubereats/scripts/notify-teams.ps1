# Post a card to the Snarf's TPD Teams webhook in ~/.claude/snarfs-ubereats.json.
# usage: notify-teams.ps1 -Title <t> -Mention code|done (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
# code tags codeMention (Uber code needed, or a failed run); done tags doneMention (run finished).
param([string]$Title, [ValidateSet('code', 'done')][string]$Mention, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\snarfs-ubereats.json" | ConvertFrom-Json

if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = @($r.stores | Where-Object { $_.status -eq 'approved' })
  $sum = ($ok | Measure-Object -Property amount -Sum).Sum
  $Lines = @("**$($r.entryDate)** (week $($r.period)): $($ok.Count) of $(@($r.stores).Count) approved, $('{0:N2}' -f [double]$sum)")
  foreach ($s in $r.stores) {
    $Lines += "- $($s.store): $($s.status)$(if ($s.amount) { ', ' + ('{0:N2}' -f [double]$s.amount) })$(if ($s.backup) { ', backup attached' })"
    foreach ($w in @($s.warnings)) { if ($w) { $Lines += "- $($s.store): $w" } }
  }
  if ($r.note) { $Lines += $r.note }
}

$who = if ($Mention -eq 'code') { $cfg.codeMention } else { $cfg.doneMention }
$ask = if ($Mention -eq 'code') { 'please enter the Uber Eats code in the open browser window.' } else { 'please review.' }
if ($Mention -eq 'code' -and $Title -match 'FAILED') { $ask = 'please check the run.' }
$at = "<at>$($who.name)</at>"
$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) +
    @(@{ type = 'TextBlock'; text = "$at $ask"; wrap = $true })
  msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $who.email; name = $who.name } }) } }
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
